export interface OnboardingDoctor {
  id: string;
  name: string;
  degree: string;
  specialization: string;
  experience: string;
  registrationNumber: string;
  languages: string;
  consultationDuration: string;
  biography: string;
  profileImageUrl: string;
}

export interface OnboardingProgress {
  currentStep: number;
  step1?: { doctors: OnboardingDoctor[] };
  step2?: {
    clinicName: string;
    logoUrl: string;
    address: string;
    city: string;
    state: string;
    pincode: string;
    googleMapsLink: string;
    latitude: string;
    longitude: string;
    phone: string;
    email: string;
    website: string;
    images: string;
    emergencyAvailable: boolean;
    parking: boolean;
    wheelchairAccess: boolean;
    otherFacilities: string;
  };
  step3?: {
    normalConsultation: string;
    emergencyConsultation: string;
    videoConsultation: string;
    homeVisit: string;
    followUpFee: string;
    freeFollowUpDays: string;
    refundPolicy: string;
    cancellationPolicy: string;
    paymentMethods: string[];
  };
  step4?: {
    schedules: Record<
      string,
      {
        weekly: Record<string, { open: string; close: string; closed: boolean }>;
        slotDuration: string;
        bufferTime: string;
        maxDailyPatients: string;
        emergencySlots: string;
        holidays: string;
        leave: string;
      }
    >;
  };
  step5?: {
    upi: string;
    gst: string;
    invoicePrefix: string;
    prescriptionHeader: string;
    digitalSignatureUrl: string;
    whatsappNumber: string;
    socialLinks: string;
  };
}

export function emptyDoctor(): OnboardingDoctor {
  return {
    id: crypto.randomUUID(),
    name: "",
    degree: "",
    specialization: "",
    experience: "",
    registrationNumber: "",
    languages: "",
    consultationDuration: "15",
    biography: "",
    profileImageUrl: "",
  };
}

export function defaultProgress(clinicName?: string): OnboardingProgress {
  return {
    currentStep: 1,
    step1: { doctors: [emptyDoctor()] },
    step2: {
      clinicName: clinicName ?? "",
      logoUrl: "",
      address: "",
      city: "",
      state: "",
      pincode: "",
      googleMapsLink: "",
      latitude: "",
      longitude: "",
      phone: "",
      email: "",
      website: "",
      images: "",
      emergencyAvailable: false,
      parking: false,
      wheelchairAccess: false,
      otherFacilities: "",
    },
    step3: {
      normalConsultation: "500",
      emergencyConsultation: "800",
      videoConsultation: "400",
      homeVisit: "1000",
      followUpFee: "300",
      freeFollowUpDays: "7",
      refundPolicy: "",
      cancellationPolicy: "",
      paymentMethods: ["cash", "upi", "card"],
    },
    step4: { schedules: {} },
    step5: {
      upi: "",
      gst: "",
      invoicePrefix: "INV",
      prescriptionHeader: "",
      digitalSignatureUrl: "",
      whatsappNumber: "",
      socialLinks: "",
    },
  };
}

export function mergeProgress(
  stored: Partial<OnboardingProgress> | null,
  clinicName?: string
): OnboardingProgress {
  const base = defaultProgress(clinicName);
  if (!stored) return base;
  return {
    ...base,
    ...stored,
    step1: { doctors: stored.step1?.doctors?.length ? stored.step1.doctors : base.step1!.doctors },
    step2: { ...base.step2!, ...stored.step2 },
    step3: { ...base.step3!, ...stored.step3 },
    step4: { schedules: { ...base.step4!.schedules, ...stored.step4?.schedules } },
    step5: { ...base.step5!, ...stored.step5 },
  };
}
