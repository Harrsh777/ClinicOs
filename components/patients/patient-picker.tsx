"use client";

import { useState, useTransition } from "react";
import { searchPatientsAction } from "@/lib/actions/patients";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Search } from "lucide-react";

interface PatientResult {
  id: string;
  full_name: string;
  phone: string;
  patient_code: string | null;
}

export function PatientPicker({
  clinicId,
  value,
  onChange,
  label = "Patient",
}: {
  clinicId: string;
  value: PatientResult | null;
  onChange: (patient: PatientResult | null) => void;
  label?: string;
}) {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PatientResult[]>([]);
  const [pending, startTransition] = useTransition();

  function handleSearch() {
    if (query.length < 2) return;
    startTransition(async () => {
      const patients = await searchPatientsAction(clinicId, query);
      setResults(patients as PatientResult[]);
    });
  }

  if (value) {
    return (
      <div>
        <p className="clinic-label">{label}</p>
        <div className="mt-1 flex items-center gap-2 rounded-[var(--radius-md)] border border-[var(--border)] bg-[var(--surface-2)] px-3 py-2">
          <div className="flex-1 text-sm">
            <span className="font-medium">{value.full_name}</span>
            <span className="text-[var(--text-muted)] ml-2">
              {value.patient_code ?? ""} · {value.phone}
            </span>
          </div>
          <Button type="button" variant="ghost" size="sm" onClick={() => onChange(null)}>
            Change
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div>
      <p className="clinic-label">{label}</p>
      <div className="mt-1 flex gap-2">
        <Input
          placeholder="Search by name, phone, or patient code..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && (e.preventDefault(), handleSearch())}
          className="flex-1"
        />
        <Button type="button" variant="secondary" onClick={handleSearch} loading={pending} className="gap-1.5 shrink-0">
          <Search className="h-4 w-4" />
          Search
        </Button>
      </div>
      {results.length > 0 && (
        <div className="mt-2 rounded-[var(--radius-md)] border border-[var(--border)] divide-y divide-[var(--border)] max-h-48 overflow-y-auto">
          {results.map((p) => (
            <button
              key={p.id}
              type="button"
              onClick={() => {
                onChange(p);
                setResults([]);
                setQuery("");
              }}
              className="w-full text-left px-3 py-2 text-sm hover:bg-[var(--surface-2)] transition-colors"
            >
              <span className="font-medium">{p.full_name}</span>
              <span className="text-[var(--text-muted)] ml-2">
                {p.patient_code ?? ""} · {p.phone}
              </span>
            </button>
          ))}
        </div>
      )}
      {query.length >= 2 && !pending && results.length === 0 && (
        <p className="text-xs text-[var(--text-muted)] mt-1">No patients found. Register a new patient first.</p>
      )}
    </div>
  );
}
