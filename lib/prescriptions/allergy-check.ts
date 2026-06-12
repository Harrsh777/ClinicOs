import type { PatientAllergy } from "@/lib/types/database";

const CROSS_REACTIVE: Record<string, string[]> = {
  penicillin: ["amoxicillin", "ampicillin", "augmentin", "penicillin"],
  amoxicillin: ["penicillin", "ampicillin", "augmentin"],
  sulfa: ["sulfamethoxazole", "sulfasalazine", "bactrim"],
  aspirin: ["ibuprofen", "naproxen", "nsaid"],
};

export interface AllergyWarning {
  allergen: string;
  medicine: string;
  severity: "mild" | "moderate" | "severe";
  message: string;
}

export function checkMedicineAllergies(
  medicineName: string,
  allergies: PatientAllergy[]
): AllergyWarning[] {
  const warnings: AllergyWarning[] = [];
  const medLower = medicineName.toLowerCase();

  for (const allergy of allergies) {
    const allergenLower = allergy.allergen.toLowerCase();

    const directMatch =
      medLower.includes(allergenLower) || allergenLower.includes(medLower.split(" ")[0]);

    const crossMatch = Object.entries(CROSS_REACTIVE).some(([key, variants]) => {
      const allergenMatches = allergenLower.includes(key) || variants.some((v) => allergenLower.includes(v));
      const medMatches = medLower.includes(key) || variants.some((v) => medLower.includes(v));
      return allergenMatches && medMatches;
    });

    if (directMatch || crossMatch) {
      warnings.push({
        allergen: allergy.allergen,
        medicine: medicineName,
        severity: allergy.severity,
        message: `Possible ${allergy.severity} reaction: patient is allergic to ${allergy.allergen}`,
      });
    }
  }

  return warnings;
}
