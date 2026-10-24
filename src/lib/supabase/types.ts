// Hand-authored to match supabase/migrations/20260101000000_initial_schema.sql.
// Once the project is live, regenerate and diff with:
//   npx supabase gen types typescript --project-id <ref> > src/lib/supabase/types.ts

export type UserRole = "student" | "rep" | "supplier" | "admin";
export type OrderType = "tooth" | "store";
export type PaymentStatus = "unpaid" | "pending" | "paid";
export type FulfillmentStatus =
  | "pending"
  | "confirmed"
  | "fulfilled"
  | "cancelled"
  | "rejected";
export type ToothType = "frasaco" | "copy_a";

/** A line a seller took off an order as unavailable, as it was charged. */
export interface UnavailableLine {
  tooth_number: number | null;
  tooth_type: ToothType | null;
  product_name: string | null;
  product_unit: string | null;
  quantity: number;
  /** numeric in the database, so JSON gives a number. */
  unit_price: number;
  line_total: number;
}
export type AccountStatus = "active" | "suspended" | "pending_approval";
export type SupplierKind = "student_supplier" | "shop";

// A line sent to submit_tooth_order: a tooth or one of the seller's
// products. Never a price — the database reads every price itself.
export type SubmitToothOrderItem =
  | { tooth_number: number; tooth_type: ToothType; quantity: number }
  | { product_id: string; quantity: number };

// postgrest-js resolves embeds (e.g. `.from("orders").select("order_items(*)")`)
// by matching a literal `referencedRelation` string inside the CURRENT
// table's own Relationships array — even for the "reverse" direction, where
// the FK column actually lives on the other table. Real `supabase gen types`
// output duplicates each relationship object onto both tables involved for
// exactly this reason, so this hand-authored file does the same.
//
// foreignKeyName/referencedRelation/isOneToOne must stay narrow literal
// types (hence the individual `as const`s below) or postgrest-js's embed
// matching silently fails; columns/referencedColumns must stay plain
// mutable string[] or the object stops structurally matching
// GenericRelationship at all.
/* eslint-disable @typescript-eslint/no-unused-vars -- each REL_* constant is
   read only through `typeof` in the Relationships tuples below; that's a type
   position, not a value read, so the linter can't see the usage. */
const REL_SUPPLIERS_PROFILES = {
  foreignKeyName: "suppliers_id_fkey" as const,
  columns: ["id"],
  isOneToOne: true as const,
  referencedRelation: "profiles" as const,
  referencedColumns: ["id"],
};
const REL_PRODUCTS_SUPPLIERS = {
  foreignKeyName: "products_supplier_id_fkey" as const,
  columns: ["supplier_id"],
  isOneToOne: false as const,
  referencedRelation: "suppliers" as const,
  referencedColumns: ["id"],
};
const REL_PRODUCTS_CATEGORIES = {
  foreignKeyName: "products_category_id_fkey" as const,
  columns: ["category_id"],
  isOneToOne: false as const,
  referencedRelation: "product_categories" as const,
  referencedColumns: ["id"],
};
const REL_ORDERS_PROFILES = {
  foreignKeyName: "orders_student_id_fkey" as const,
  columns: ["student_id"],
  isOneToOne: false as const,
  referencedRelation: "profiles" as const,
  referencedColumns: ["id"],
};
const REL_ORDERS_SUPPLIERS = {
  foreignKeyName: "orders_supplier_id_fkey" as const,
  columns: ["supplier_id"],
  isOneToOne: false as const,
  referencedRelation: "suppliers" as const,
  referencedColumns: ["id"],
};
const REL_ORDER_ITEMS_ORDERS = {
  foreignKeyName: "order_items_order_id_fkey" as const,
  columns: ["order_id"],
  isOneToOne: false as const,
  referencedRelation: "orders" as const,
  referencedColumns: ["id"],
};
const REL_ORDER_ITEMS_PRODUCTS = {
  foreignKeyName: "order_items_product_id_fkey" as const,
  columns: ["product_id"],
  isOneToOne: false as const,
  referencedRelation: "products" as const,
  referencedColumns: ["id"],
};
const REL_COMMISSION_STATEMENTS_SUPPLIERS = {
  foreignKeyName: "commission_statements_supplier_id_fkey" as const,
  columns: ["supplier_id"],
  isOneToOne: false as const,
  referencedRelation: "suppliers" as const,
  referencedColumns: ["id"],
};

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          role: UserRole;
          full_name: string;
          phone: string | null;
          university: string | null;
          year_of_study: number | null;
          section: string | null;
          status: AccountStatus;
          created_at: string;
        };
        Insert: {
          id: string;
          role?: UserRole;
          full_name: string;
          phone?: string | null;
          university?: string | null;
          year_of_study?: number | null;
          section?: string | null;
          status?: AccountStatus;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["profiles"]["Insert"]>;
        Relationships: [typeof REL_SUPPLIERS_PROFILES, typeof REL_ORDERS_PROFILES];
      };
      suppliers: {
        Row: {
          id: string;
          kind: SupplierKind;
          display_name: string;
          university: string | null;
          frasaco_price: string;
          copy_a_price: string;
          whish_number: string | null;
          price_updated_at: string | null;
          subscription_paid_until: string | null;
          business_name: string | null;
          contact_phone: string | null;
          contact_email: string | null;
          logo_url: string | null;
          description: string | null;
          commission_rate: string;
          delivery_notes: string | null;
          status: AccountStatus;
          /** The semester week (1-17) this seller takes orders for. New orders take it, by trigger. */
          current_week: number;
          /** When current_week was last set. Stamped by the database. */
          week_set_at: string;
          created_at: string;
        };
        Insert: {
          id: string;
          kind?: SupplierKind;
          display_name: string;
          university?: string | null;
          frasaco_price?: string;
          copy_a_price?: string;
          whish_number?: string | null;
          price_updated_at?: string | null;
          subscription_paid_until?: string | null;
          business_name?: string | null;
          // Nullable since 20260109000000: a student who sells to their
          // year has no shop phone number to give.
          contact_phone?: string | null;
          contact_email?: string | null;
          logo_url?: string | null;
          description?: string | null;
          commission_rate?: string;
          delivery_notes?: string | null;
          status?: AccountStatus;
          current_week?: number;
          week_set_at?: string;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["suppliers"]["Insert"]>;
        Relationships: [typeof REL_SUPPLIERS_PROFILES, typeof REL_PRODUCTS_SUPPLIERS, typeof REL_ORDERS_SUPPLIERS, typeof REL_COMMISSION_STATEMENTS_SUPPLIERS];
      };
      product_categories: {
        Row: {
          id: string;
          name: string;
          slug: string;
          sort_order: number;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          sort_order?: number;
        };
        Update: Partial<Database["public"]["Tables"]["product_categories"]["Insert"]>;
        Relationships: [typeof REL_PRODUCTS_CATEGORIES];
      };
      products: {
        Row: {
          id: string;
          supplier_id: string;
          category_id: string;
          name: string;
          description: string | null;
          /** Optional, up to 60 characters. Describes the product; not copied onto order lines. */
          brand: string | null;
          image_url: string | null;
          price: string;
          unit: string | null;
          stock_qty: number | null;
          is_active: boolean;
          /** Still sold, but none right now. Both this and is_active must be on for students to see it. */
          in_stock: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          supplier_id: string;
          category_id: string;
          name: string;
          description?: string | null;
          brand?: string | null;
          image_url?: string | null;
          price: string;
          unit?: string | null;
          stock_qty?: number | null;
          is_active?: boolean;
          in_stock?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["products"]["Insert"]>;
        Relationships: [typeof REL_PRODUCTS_SUPPLIERS, typeof REL_PRODUCTS_CATEGORIES, typeof REL_ORDER_ITEMS_PRODUCTS];
      };
      orders: {
        Row: {
          id: string;
          order_type: OrderType;
          student_id: string;
          supplier_id: string | null;
          week_number: number | null;
          subtotal: string;
          commission_rate: string;
          commission_amount: string;
          total_price: string;
          payment_status: PaymentStatus;
          fulfillment_status: FulfillmentStatus;
          delivery_address: string | null;
          notes: string | null;
          created_at: string;
          updated_at: string;
          rejection_reason: string | null;
          /** Set when a student edited this pending order: the order that took its place. */
          replaced_by: string | null;
          /** Set when the student cancelled it while pending. Frozen from then on. */
          cancelled_at: string | null;
          /** Set when the seller took unavailable lines off: the order this one replaced. */
          amended_from: string | null;
          /** Lines the seller took off as unavailable, each as it was charged. */
          unavailable_lines: UnavailableLine[];
          /** Timeline, stamped by the database on each status change. */
          confirmed_at: string | null;
          fulfilled_at: string | null;
          paid_at: string | null;
          rejected_at: string | null;
          amended_at: string | null;
        };
        Insert: {
          id?: string;
          order_type: OrderType;
          student_id: string;
          supplier_id?: string | null;
          week_number?: number | null;
          subtotal?: string;
          commission_rate?: string;
          commission_amount?: string;
          total_price?: string;
          payment_status?: PaymentStatus;
          fulfillment_status?: FulfillmentStatus;
          delivery_address?: string | null;
          notes?: string | null;
          created_at?: string;
          updated_at?: string;
          rejection_reason?: string | null;
          replaced_by?: string | null;
          cancelled_at?: string | null;
          amended_from?: string | null;
          unavailable_lines?: UnavailableLine[];
        };
        Update: Partial<Database["public"]["Tables"]["orders"]["Insert"]>;
        Relationships: [typeof REL_ORDERS_PROFILES, typeof REL_ORDERS_SUPPLIERS, typeof REL_ORDER_ITEMS_ORDERS];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          tooth_number: number | null;
          tooth_type: ToothType | null;
          product_id: string | null;
          product_name: string | null;
          /** Snapshotted with the name and price: "box of 100" as it was when ordered. */
          product_unit: string | null;
          quantity: number;
          unit_price: string;
          line_total: string;
        };
        Insert: {
          id?: string;
          order_id: string;
          tooth_number?: number | null;
          tooth_type?: ToothType | null;
          product_id?: string | null;
          product_name?: string | null;
          product_unit?: string | null;
          quantity: number;
          unit_price: string;
          line_total: string;
        };
        Update: Partial<Database["public"]["Tables"]["order_items"]["Insert"]>;
        Relationships: [typeof REL_ORDER_ITEMS_ORDERS, typeof REL_ORDER_ITEMS_PRODUCTS];
      };
      commission_statements: {
        Row: {
          id: string;
          supplier_id: string;
          period_start: string;
          period_end: string;
          order_count: number;
          gross_sales: string;
          commission_due: string;
          is_settled: boolean;
          settled_at: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          supplier_id: string;
          period_start: string;
          period_end: string;
          order_count?: number;
          gross_sales?: string;
          commission_due?: string;
          is_settled?: boolean;
          settled_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["commission_statements"]["Insert"]>;
        Relationships: [typeof REL_COMMISSION_STATEMENTS_SUPPLIERS];
      };
    };
    Views: {
      // The sanctioned public window onto suppliers. The market a student
      // chooses between: no whish_number, no subscription state.
      supplier_directory: {
        Row: {
          id: string;
          display_name: string;
          kind: SupplierKind;
          university: string | null;
          frasaco_price: string;
          copy_a_price: string;
        };
        // A view carries no foreign keys of its own; postgrest-js still
        // requires the key to be present, and omitting it makes every
        // table in this file resolve to `never`.
        Relationships: [];
      };
    };
    Functions: {
      current_user_role: {
        Args: Record<string, never>;
        Returns: UserRole;
      };
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
      };
      submit_tooth_order: {
        Args: {
          p_supplier_id: string;
          p_week_number: number;
          p_items: SubmitToothOrderItem[];
          /** The total the student was shown. Refused with DT001 if the real one differs. */
          p_expected_total?: number | null;
        };
        Returns: string;
      };
      cancel_pending_order: {
        Args: { p_order_id: string };
        Returns: undefined;
      };
      edit_pending_order: {
        Args: { p_order_id: string; p_items: SubmitToothOrderItem[]; p_expected_total: number | null };
        Returns: string;
      };
      remove_unavailable_lines: {
        Args: { p_order_id: string; p_line_ids: string[] };
        Returns: string;
      };
    };
    Enums: {
      user_role: UserRole;
      order_type: OrderType;
      payment_status: PaymentStatus;
      fulfillment_status: FulfillmentStatus;
      tooth_type: ToothType;
      account_status: AccountStatus;
    };
  };
}
