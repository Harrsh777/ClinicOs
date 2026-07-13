"use client";

import { useEffect } from "react";

interface PrintPrescriptionProps {
  prescription: {
    id: string;
    created_at: string;
    notes: string | null;
    patients: { full_name: string; phone: string; date_of_birth: string | null };
    doctors: { profiles: { full_name: string; specialization: string | null } };
    prescription_items: {
      medicine_name: string;
      dosage: string;
      frequency: string;
      duration: string;
      instructions: string | null;
    }[];
    consultations?: {
      clinics: {
        name: string;
        address: string | null;
        phone: string | null;
        prescription_header?: string | null;
        digital_signature_url?: string | null;
      };
    };
  };
}

export function PrintPrescription({ prescription }: PrintPrescriptionProps) {
  useEffect(() => {
    setTimeout(() => window.print(), 500);
  }, []);

  const clinic = prescription.consultations?.clinics;
  const items = [...(prescription.prescription_items ?? [])].sort(
    (a, b) => (a as { sort_order?: number }).sort_order! - (b as { sort_order?: number }).sort_order!
  );

  return (
    <div className="max-w-2xl mx-auto p-8 bg-white text-black print:p-4">
      <style>{`@media print { body { background: white; } nav, header { display: none; } }`}</style>

      <div className="text-center border-b-2 border-teal-600 pb-4 mb-6">
        <h1 className="text-2xl font-bold text-teal-800">{clinic?.name ?? "ClinicOS Clinic"}</h1>
        {clinic?.prescription_header && (
          <p className="text-sm text-gray-600 mt-1">{clinic.prescription_header}</p>
        )}
        {clinic?.address && <p className="text-sm text-gray-600">{clinic.address}</p>}
        {clinic?.phone && <p className="text-sm text-gray-600">Tel: {clinic.phone}</p>}
        <p className="text-lg font-semibold mt-4 tracking-wide">℞ E-Prescription</p>
      </div>

      <div className="grid grid-cols-2 gap-4 mb-6 text-sm">
        <div>
          <p><strong>Patient:</strong> {prescription.patients.full_name}</p>
          <p><strong>Phone:</strong> {prescription.patients.phone}</p>
          {prescription.patients.date_of_birth && (
            <p><strong>DOB:</strong> {new Date(prescription.patients.date_of_birth).toLocaleDateString()}</p>
          )}
        </div>
        <div className="text-right">
          <p><strong>Date:</strong> {new Date(prescription.created_at).toLocaleDateString()}</p>
          <p><strong>Rx ID:</strong> {prescription.id.slice(0, 8).toUpperCase()}</p>
          <p><strong>Dr.</strong> {prescription.doctors.profiles.full_name}</p>
          {prescription.doctors.profiles.specialization && (
            <p className="text-gray-600">{prescription.doctors.profiles.specialization}</p>
          )}
        </div>
      </div>

      <table className="w-full mb-6 text-sm">
        <thead>
          <tr className="border-b-2 border-gray-300 bg-gray-50">
            <th className="text-left py-2 px-1">#</th>
            <th className="text-left py-2 px-1">Medicine</th>
            <th className="text-left py-2 px-1">Dosage</th>
            <th className="text-left py-2 px-1">Frequency</th>
            <th className="text-left py-2 px-1">Duration</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i} className="border-b border-gray-200">
              <td className="py-2 px-1">{i + 1}</td>
              <td className="py-2 px-1 font-medium">{item.medicine_name}</td>
              <td className="py-2 px-1">{item.dosage}</td>
              <td className="py-2 px-1">{item.frequency}</td>
              <td className="py-2 px-1">{item.duration}</td>
            </tr>
          ))}
        </tbody>
      </table>

      {items.some((i) => i.instructions) && (
        <div className="mb-6 text-sm bg-gray-50 rounded p-3">
          <strong>Instructions:</strong>
          <ul className="mt-1 list-disc pl-5">
            {items
              .filter((i) => i.instructions)
              .map((item, i) => (
                <li key={i}>
                  <strong>{item.medicine_name}:</strong> {item.instructions}
                </li>
              ))}
          </ul>
        </div>
      )}

      {prescription.notes && (
        <div className="mb-6 text-sm border-l-4 border-teal-500 pl-3">
          <strong>Clinical advice:</strong>
          <p className="mt-1 whitespace-pre-wrap">{prescription.notes}</p>
        </div>
      )}

      <div className="mt-12 pt-8 border-t border-gray-300 flex justify-between items-end">
        <p className="text-xs text-gray-500 max-w-xs">
          This is a computer-generated prescription. Valid without physical signature when issued via ClinicOS.
        </p>
        <div className="text-right">
          {clinic?.digital_signature_url ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={clinic.digital_signature_url}
              alt="Doctor signature"
              className="h-12 ml-auto mb-1 object-contain"
            />
          ) : null}
          <p className="font-semibold">Dr. {prescription.doctors.profiles.full_name}</p>
        </div>
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
