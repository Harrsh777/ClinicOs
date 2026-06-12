"use client";

import { useEffect } from "react";

interface PrintPrescriptionProps {
  prescription: {
    id: string;
    created_at: string;
    notes: string | null;
    patients: { full_name: string; phone: string; date_of_birth: string | null };
    doctors: { profiles: { full_name: string; specialization: string | null } };
    prescription_items: { medicine_name: string; dosage: string; frequency: string; duration: string; instructions: string | null }[];
    consultations?: { clinics: { name: string; address: string | null; phone: string | null } };
  };
}

export function PrintPrescription({ prescription }: PrintPrescriptionProps) {
  useEffect(() => {
    setTimeout(() => window.print(), 500);
  }, []);

  const clinic = prescription.consultations?.clinics;
  const items = prescription.prescription_items ?? [];

  return (
    <div className="max-w-2xl mx-auto p-8 bg-white text-black print:p-4">
      <style>{`@media print { body { background: white; } nav, header { display: none; } }`}</style>
      <div className="text-center border-b-2 border-[var(--brand-600)] pb-4 mb-6">
        <h1 className="text-2xl font-bold text-[var(--brand-700)]">{clinic?.name ?? "ClinicOS Clinic"}</h1>
        {clinic?.address && <p className="text-sm text-gray-600">{clinic.address}</p>}
        {clinic?.phone && <p className="text-sm text-gray-600">{clinic.phone}</p>}
        <p className="text-lg font-semibold mt-4">℞ E-Prescription</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
        <div>
          <p><strong>Patient:</strong> {prescription.patients.full_name}</p>
          <p><strong>Phone:</strong> {prescription.patients.phone}</p>
        </div>
        <div className="text-right">
          <p><strong>Date:</strong> {new Date(prescription.created_at).toLocaleDateString()}</p>
          <p><strong>Dr.</strong> {prescription.doctors.profiles.full_name}</p>
          {prescription.doctors.profiles.specialization && (
            <p className="text-gray-600">{prescription.doctors.profiles.specialization}</p>
          )}
        </div>
      </div>

      <table className="w-full mb-6 text-sm">
        <thead>
          <tr className="border-b-2 border-gray-300">
            <th className="text-left py-2">#</th>
            <th className="text-left py-2">Medicine</th>
            <th className="text-left py-2">Dosage</th>
            <th className="text-left py-2">Frequency</th>
            <th className="text-left py-2">Duration</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i} className="border-b border-gray-200">
              <td className="py-2">{i + 1}</td>
              <td className="py-2 font-medium">{item.medicine_name}</td>
              <td className="py-2">{item.dosage}</td>
              <td className="py-2">{item.frequency}</td>
              <td className="py-2">{item.duration}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {items.some((i) => i.instructions) && (
        <div className="mb-6 text-sm">
          <strong>Instructions:</strong>
          <ul className="mt-1 list-disc pl-5">
            {items.filter((i) => i.instructions).map((item, i) => (
              <li key={i}>{item.medicine_name}: {item.instructions}</li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-12 pt-8 border-t border-gray-300 text-right">
        <p className="font-semibold">Dr. {prescription.doctors.profiles.full_name}</p>
        <p className="text-xs text-gray-500 mt-4">This is a computer-generated prescription. Valid without physical signature.</p>
      </div>

      <button
        type="button"
        onClick={() => window.print()}
        className="clinic-btn clinic-btn-primary mt-6 print:hidden"
      >
        Print / Save as PDF
      </button>
    </div>
  );
}
