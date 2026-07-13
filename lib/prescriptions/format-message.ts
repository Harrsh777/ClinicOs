interface PrescriptionItemRow {
  medicine_name: string;
  dosage: string;
  frequency: string;
  duration: string;
  instructions?: string | null;
}

export function buildPrescriptionShareMessage(params: {
  patientName: string;
  doctorName: string;
  clinicName: string;
  items: PrescriptionItemRow[];
  notes?: string | null;
  printUrl: string;
}) {
  const lines = params.items.map(
    (item, i) =>
      `${i + 1}. ${item.medicine_name} — ${item.dosage}, ${item.frequency}, ${item.duration}${
        item.instructions ? ` (${item.instructions})` : ""
      }`
  );

  return (
    `*Prescription from ${params.clinicName}*\n\n` +
    `Dear ${params.patientName},\n\n` +
    `Dr. ${params.doctorName} has issued your e-prescription:\n\n` +
    lines.join("\n") +
    (params.notes ? `\n\n*Advice:* ${params.notes}` : "") +
    `\n\nView & download: ${params.printUrl}\n\n` +
    `Please follow the dosage instructions. Contact the clinic for any questions.`
  );
}

export function buildPrescriptionEmailHtml(params: {
  patientName: string;
  doctorName: string;
  clinicName: string;
  items: PrescriptionItemRow[];
  notes?: string | null;
  printUrl: string;
}) {
  const rows = params.items
    .map(
      (item, i) =>
        `<tr>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb">${i + 1}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb"><strong>${item.medicine_name}</strong></td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb">${item.dosage}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb">${item.frequency}</td>
          <td style="padding:8px;border-bottom:1px solid #e5e7eb">${item.duration}</td>
        </tr>`
    )
    .join("");

  return `
    <div style="font-family:sans-serif;max-width:600px;margin:0 auto">
      <h2 style="color:#0d9488">${params.clinicName}</h2>
      <p>Dear ${params.patientName},</p>
      <p>Dr. ${params.doctorName} has issued your e-prescription.</p>
      <table style="width:100%;border-collapse:collapse;margin:16px 0;font-size:14px">
        <thead>
          <tr style="background:#f3f4f6">
            <th style="padding:8px;text-align:left">#</th>
            <th style="padding:8px;text-align:left">Medicine</th>
            <th style="padding:8px;text-align:left">Dosage</th>
            <th style="padding:8px;text-align:left">Frequency</th>
            <th style="padding:8px;text-align:left">Duration</th>
          </tr>
        </thead>
        <tbody>${rows}</tbody>
      </table>
      ${params.notes ? `<p><strong>Clinical advice:</strong> ${params.notes}</p>` : ""}
      <p><a href="${params.printUrl}" style="display:inline-block;background:#0d9488;color:white;padding:10px 20px;border-radius:6px;text-decoration:none">View Prescription</a></p>
      <p style="font-size:12px;color:#6b7280">This is a computer-generated prescription from ClinicOS.</p>
    </div>
  `;
}
