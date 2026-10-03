import type { AccountStatus } from "@/lib/supabase/types";

export const SELLER_STATUS_LABEL: Record<AccountStatus, string> = {
  active: "Taking orders",
  pending_approval: "Waiting for approval",
  suspended: "Paused",
};
