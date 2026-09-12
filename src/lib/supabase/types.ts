// Hand-authored to match supabase/migrations/20260101000000_initial_schema.sql.
// Once the project is live, regenerate and diff with:
//   npx supabase gen types typescript --project-id <ref> > src/lib/supabase/types.ts

export type UserRole = "student" | "rep" | "supplier" | "admin";
export type OrderType = "tooth" | "store";
export type PaymentStatus = "unpaid" | "pending" | "paid";
export type FulfillmentStatus = "pending" | "confirmed" | "fulfilled" | "cancelled";
export type ToothType = "frasaco" | "copy_a";
export type AccountStatus = "active" | "suspended" | "pending_approval";

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
        Relationships: [];
      };
      representatives: {
        Row: {
          id: string;
          display_name: string;
          university: string;
          year_of_study: number | null;
          section: string | null;
          frasaco_price: string;
          copy_a_price: string;
          whish_number: string | null;
          subscription_paid_until: string | null;
          price_updated_at: string | null;
          created_at: string;
        };
        Insert: {
          id: string;
          display_name: string;
          university: string;
          year_of_study?: number | null;
          section?: string | null;
          frasaco_price?: string;
          copy_a_price?: string;
          whish_number?: string | null;
          subscription_paid_until?: string | null;
          price_updated_at?: string | null;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["representatives"]["Insert"]>;
        Relationships: [];
      };
      student_reps: {
        Row: {
          student_id: string;
          rep_id: string;
          assigned_at: string;
        };
        Insert: {
          student_id: string;
          rep_id: string;
          assigned_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["student_reps"]["Insert"]>;
        Relationships: [];
      };
      suppliers: {
        Row: {
          id: string;
          business_name: string;
          contact_phone: string;
          contact_email: string | null;
          logo_url: string | null;
          description: string | null;
          commission_rate: string;
          delivery_notes: string | null;
          status: AccountStatus;
          created_at: string;
        };
        Insert: {
          id: string;
          business_name: string;
          contact_phone: string;
          contact_email?: string | null;
          logo_url?: string | null;
          description?: string | null;
          commission_rate?: string;
          delivery_notes?: string | null;
          status?: AccountStatus;
          created_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["suppliers"]["Insert"]>;
        Relationships: [];
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
        Relationships: [];
      };
      products: {
        Row: {
          id: string;
          supplier_id: string;
          category_id: string | null;
          name: string;
          description: string | null;
          image_url: string | null;
          price: string;
          unit: string | null;
          stock_qty: number | null;
          is_active: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          supplier_id: string;
          category_id?: string | null;
          name: string;
          description?: string | null;
          image_url?: string | null;
          price: string;
          unit?: string | null;
          stock_qty?: number | null;
          is_active?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: Partial<Database["public"]["Tables"]["products"]["Insert"]>;
        Relationships: [];
      };
      orders: {
        Row: {
          id: string;
          order_type: OrderType;
          student_id: string;
          rep_id: string | null;
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
        };
        Insert: {
          id?: string;
          order_type: OrderType;
          student_id: string;
          rep_id?: string | null;
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
        };
        Update: Partial<Database["public"]["Tables"]["orders"]["Insert"]>;
        Relationships: [];
      };
      order_items: {
        Row: {
          id: string;
          order_id: string;
          tooth_number: number | null;
          tooth_type: ToothType | null;
          product_id: string | null;
          product_name: string | null;
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
          quantity: number;
          unit_price: string;
          line_total: string;
        };
        Update: Partial<Database["public"]["Tables"]["order_items"]["Insert"]>;
        Relationships: [];
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
        Relationships: [];
      };
    };
    Views: Record<string, never>;
    Functions: {
      current_user_role: {
        Args: Record<string, never>;
        Returns: UserRole;
      };
      is_admin: {
        Args: Record<string, never>;
        Returns: boolean;
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
