"use client";

import * as React from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { useTransition, useCallback } from "react";
import Box from "@mui/material/Box";
import TextField from "@mui/material/TextField";
import FormControl from "@mui/material/FormControl";
import InputLabel from "@mui/material/InputLabel";
import Select from "@mui/material/Select";
import MenuItem from "@mui/material/MenuItem";
import Button from "@mui/material/Button";
import InputAdornment from "@mui/material/InputAdornment";
import LinearProgress from "@mui/material/LinearProgress";
import SearchIcon from "@mui/icons-material/Search";
import FilterListOffIcon from "@mui/icons-material/FilterListOff";

export type UrlFilterField =
  | {
      key: string;
      label: string;
      type: "text";
      placeholder?: string;
      debounceMs?: number;
      /** MUI width, e.g. { xs: '100%', sm: 260 } */
      sx?: Record<string, unknown>;
    }
  | {
      key: string;
      label: string;
      type: "select";
      options: { value: string; label: string }[];
      emptyLabel?: string;
      sx?: Record<string, unknown>;
    };

type Props = {
  fields: UrlFilterField[];
  resetKeys?: string[];
};

function useDebouncedValue<T>(value: T, delay: number): T {
  const [debounced, setDebounced] = React.useState(value);
  React.useEffect(() => {
    const id = setTimeout(() => setDebounced(value), delay);
    return () => clearTimeout(id);
  }, [value, delay]);
  return debounced;
}

function TextFilterInput({
  field,
  value,
  onCommit,
}: {
  field: Extract<UrlFilterField, { type: "text" }>;
  value: string;
  onCommit: (v: string | null) => void;
}) {
  const [local, setLocal] = React.useState(value);
  const debounced = useDebouncedValue(local, field.debounceMs ?? 400);
  const commitRef = React.useRef(onCommit);
  React.useEffect(() => {
    commitRef.current = onCommit;
  });
  React.useEffect(() => {
    const next = debounced.trim();
    const cur = value.trim();
    if (next !== cur) commitRef.current(next || null);
  }, [debounced, value]);

  return (
    <TextField
      size="small"
      label={field.label}
      placeholder={field.placeholder}
      value={local}
      onChange={(e) => setLocal(e.target.value)}
      sx={field.sx ?? { width: { xs: "100%", sm: 260 } }}
      slotProps={{
        input: {
          startAdornment: (
            <InputAdornment position="start">
              <SearchIcon fontSize="small" color="action" />
            </InputAdornment>
          ),
        },
      }}
    />
  );
}

export function UrlSyncedFilters({ fields, resetKeys }: Props) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const keys = React.useMemo(
    () => resetKeys ?? fields.map((f) => f.key),
    [fields, resetKeys]
  );

  const setParam = useCallback(
    (updates: Record<string, string | null>) => {
      const next = new URLSearchParams(searchParams.toString());
      for (const [k, v] of Object.entries(updates)) {
        if (v === null || v === "") next.delete(k);
        else next.set(k, v);
      }
      const s = next.toString();
      startTransition(() => {
        router.push(s ? `${pathname}?${s}` : pathname);
      });
    },
    [router, pathname, searchParams]
  );

  const clearAll = () => {
    const updates = Object.fromEntries(keys.map((k) => [k, null])) as Record<string, null>;
    setParam(updates);
  };

  const hasFilters = keys.some((k) => {
    const v = searchParams.get(k);
    return v !== null && v !== "";
  });

  return (
    <Box sx={{ mb: 2 }}>
      {isPending && (
        <LinearProgress
          sx={{ position: "relative", top: 0, mb: 1, height: 2 }}
        />
      )}
      <Box
        sx={{
          p: 2,
          bgcolor: "background.paper",
          border: 1,
          borderColor: "divider",
        }}
      >
        <Box
          sx={{
            display: "flex",
            flexDirection: { xs: "column", sm: "row" },
            flexWrap: "wrap",
            gap: 2,
            alignItems: { xs: "stretch", sm: "flex-start" },
          }}
        >
          {fields.map((field) => {
            if (field.type === "text") {
              const val = searchParams.get(field.key) ?? "";
              return (
                <TextFilterInput
                  key={`${field.key}:${val}`}
                  field={field}
                  value={val}
                  onCommit={(v) => setParam({ [field.key]: v })}
                />
              );
            }
            const val = searchParams.get(field.key) ?? "";
            return (
              <FormControl key={field.key} size="small" sx={field.sx ?? { minWidth: 170 }}>
                <InputLabel>{field.label}</InputLabel>
                <Select
                  label={field.label}
                  value={val}
                  onChange={(e) => setParam({ [field.key]: (e.target.value as string) || null })}
                >
                  <MenuItem value="">
                    <em>{field.emptyLabel ?? "All"}</em>
                  </MenuItem>
                  {field.options.map((o) => (
                    <MenuItem key={o.value} value={o.value}>
                      {o.label}
                    </MenuItem>
                  ))}
                </Select>
              </FormControl>
            );
          })}
          <Button
            size="small"
            variant="outlined"
            startIcon={<FilterListOffIcon />}
            onClick={clearAll}
            disabled={!hasFilters || isPending}
            sx={{ ml: { sm: "auto" }, alignSelf: { sm: "center" } }}
          >
            Clear filters
          </Button>
        </Box>
      </Box>
    </Box>
  );
}
