"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import { roundForStorage } from "@/lib/format";

export type TriField = "price" | "shares" | "marketValue";

interface UseTriFieldLinkedOptions {
  price: number;
  shares: number;
  marketValue: number;
}

interface UseTriFieldLinkedReturn {
  price: string;
  shares: string;
  marketValue: string;
  computedField: TriField;
  onPriceChange: (val: string) => void;
  onSharesChange: (val: string) => void;
  onMarketValueChange: (val: string) => void;
}

/**
 * 三字段联动 hook：股价/份额/市值
 * 规则：最后两次被手动编辑的字段锁定，第三个自动计算。
 * 被计算的字段用 computedField 标识，UI 可据此显示浅色/斜体样式。
 */
export function useTriFieldLinked(initial: UseTriFieldLinkedOptions): UseTriFieldLinkedReturn {
  const [price, setPrice] = useState(initial.price.toString());
  const [shares, setShares] = useState(initial.shares.toString());
  const [marketValue, setMarketValue] = useState(initial.marketValue.toString());
  // lastEdited: 最近两次手动编辑的字段，[older, newer]
  const lastEdited = useRef<[TriField, TriField]>(["price", "shares"]);

  const getComputedField = (): TriField => {
    const all: TriField[] = ["price", "shares", "marketValue"];
    return all.find((f) => !lastEdited.current.includes(f))!;
  };

  const [computedField, setComputedField] = useState<TriField>(getComputedField);

  const pushEdited = (field: TriField) => {
    const [, newer] = lastEdited.current;
    if (newer !== field) {
      lastEdited.current = [newer, field];
    }
    setComputedField(getComputedField());
  };

  const recalc = (
    pStr: string,
    sStr: string,
    mvStr: string,
    computed: TriField
  ): { price: string; shares: string; marketValue: string } => {
    const p = parseFloat(pStr) || 0;
    const s = parseFloat(sStr) || 0;
    const mv = parseFloat(mvStr) || 0;

    if (computed === "marketValue") {
      return {
        price: pStr,
        shares: sStr,
        marketValue: roundForStorage(p * s, "amount").toString(),
      };
    }
    if (computed === "price") {
      if (s === 0) return { price: pStr, shares: sStr, marketValue: mvStr };
      return {
        price: roundForStorage(mv / s, "price").toString(),
        shares: sStr,
        marketValue: mvStr,
      };
    }
    // computed === "shares"
    if (p === 0) return { price: pStr, shares: sStr, marketValue: mvStr };
    return {
      price: pStr,
      shares: roundForStorage(mv / p, "shares").toString(),
      marketValue: mvStr,
    };
  };

  const onPriceChange = (val: string) => {
    setPrice(val);
    pushEdited("price");
    const computed = getComputedField();
    const result = recalc(val, shares, marketValue, computed);
    setShares(result.shares);
    setMarketValue(result.marketValue);
  };

  const onSharesChange = (val: string) => {
    setShares(val);
    pushEdited("shares");
    const computed = getComputedField();
    const result = recalc(price, val, marketValue, computed);
    setPrice(result.price);
    setMarketValue(result.marketValue);
  };

  const onMarketValueChange = (val: string) => {
    setMarketValue(val);
    pushEdited("marketValue");
    const computed = getComputedField();
    const result = recalc(price, shares, val, computed);
    setPrice(result.price);
    setShares(result.shares);
  };

  return {
    price,
    shares,
    marketValue,
    computedField,
    onPriceChange,
    onSharesChange,
    onMarketValueChange,
  };
}

export function useFetch<T>(url: string) {
  const [data, setData] = useState<T | null>(null);
  const [loading, setLoading] = useState(true);

  const refetch = useCallback(async () => {
    setLoading(true);
    const res = await fetch(url);
    const json = await res.json();
    setData(json);
    setLoading(false);
  }, [url]);

  useEffect(() => {
    refetch();
  }, [refetch]);

  return { data, loading, refetch };
}
