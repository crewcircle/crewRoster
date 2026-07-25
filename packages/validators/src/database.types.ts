// =============================================================================
// Database types generated from Supabase migrations
// Generated: 2026-07-25
//
// Source migrations:
//   - 20260328_core_schema.sql         (tenants, locations, profiles, rosters,
//                                        shifts, availability, clock_events)
//   - 20260329_add_push_tokens.sql     (push_tokens)
//   - 20260723_add_tenant_members.sql   (tenant_members)
//   - 20260725_fixup_tenants_columns.sql (tenants.slug, tenants.owner_id)
// =============================================================================

export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export interface Database {
  public: {
    Tables: {
      tenants: {
        Row: {
          id: string;
          name: string;
          abn: string | null;
          timezone: string;
          plan: "free" | "starter";
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          slug: string | null;
          owner_id: string | null;
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          name: string;
          abn?: string | null;
          timezone?: string;
          plan?: "free" | "starter";
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          slug?: string | null;
          owner_id?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          name?: string;
          abn?: string | null;
          timezone?: string;
          plan?: "free" | "starter";
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          slug?: string | null;
          owner_id?: string | null;
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [];
      };
      locations: {
        Row: {
          id: string;
          tenant_id: string;
          name: string;
          address: string | null;
          latitude: number | null;
          longitude: number | null;
          geofence_radius_m: number;
          timezone: string;
          created_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          name: string;
          address?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          geofence_radius_m?: number;
          timezone?: string;
          created_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          name?: string;
          address?: string | null;
          latitude?: number | null;
          longitude?: number | null;
          geofence_radius_m?: number;
          timezone?: string;
          created_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "locations_tenant_id_fkey";
            columns: ["tenant_id"];
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          }
        ];
      };
      profiles: {
        Row: {
          id: string;
          tenant_id: string;
          role: "owner" | "manager" | "employee";
          first_name: string | null;
          last_name: string | null;
          email: string;
          phone: string | null;
          created_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id: string;
          tenant_id: string;
          role?: "owner" | "manager" | "employee";
          first_name?: string | null;
          last_name?: string | null;
          email: string;
          phone?: string | null;
          created_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          role?: "owner" | "manager" | "employee";
          first_name?: string | null;
          last_name?: string | null;
          email?: string;
          phone?: string | null;
          created_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "profiles_tenant_id_fkey";
            columns: ["tenant_id"];
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          }
        ];
      };
      tenant_members: {
        Row: {
          id: string;
          tenant_id: string;
          profile_id: string;
          role: "owner" | "manager" | "employee";
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          profile_id: string;
          role?: "owner" | "manager" | "employee";
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          profile_id?: string;
          role?: "owner" | "manager" | "employee";
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "tenant_members_tenant_id_fkey";
            columns: ["tenant_id"];
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "tenant_members_profile_id_fkey";
            columns: ["profile_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      rosters: {
        Row: {
          id: string;
          tenant_id: string;
          location_id: string;
          week_start: string;
          status: "draft" | "published" | "archived";
          published_at: string | null;
          published_by: string | null;
          created_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          location_id: string;
          week_start: string;
          status?: "draft" | "published" | "archived";
          published_at?: string | null;
          published_by?: string | null;
          created_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          location_id?: string;
          week_start?: string;
          status?: "draft" | "published" | "archived";
          published_at?: string | null;
          published_by?: string | null;
          created_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "rosters_tenant_id_fkey";
            columns: ["tenant_id"];
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rosters_location_id_fkey";
            columns: ["location_id"];
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "rosters_published_by_fkey";
            columns: ["published_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      shifts: {
        Row: {
          id: string;
          tenant_id: string;
          location_id: string;
          roster_id: string;
          profile_id: string;
          start_time: string;
          end_time: string;
          role_label: string | null;
          notes: string | null;
          created_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          location_id: string;
          roster_id: string;
          profile_id: string;
          start_time: string;
          end_time: string;
          role_label?: string | null;
          notes?: string | null;
          created_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          location_id?: string;
          roster_id?: string;
          profile_id?: string;
          start_time?: string;
          end_time?: string;
          role_label?: string | null;
          notes?: string | null;
          created_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "shifts_tenant_id_fkey";
            columns: ["tenant_id"];
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shifts_location_id_fkey";
            columns: ["location_id"];
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shifts_roster_id_fkey";
            columns: ["roster_id"];
            referencedRelation: "rosters";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "shifts_profile_id_fkey";
            columns: ["profile_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      availability: {
        Row: {
          id: string;
          tenant_id: string;
          profile_id: string;
          day_of_week: number;
          start_time: string | null;
          end_time: string | null;
          is_available: boolean;
          updated_at: string;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          profile_id: string;
          day_of_week: number;
          start_time?: string | null;
          end_time?: string | null;
          is_available?: boolean;
          updated_at?: string;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          profile_id?: string;
          day_of_week?: number;
          start_time?: string | null;
          end_time?: string | null;
          is_available?: boolean;
          updated_at?: string;
        };
        Relationships: [
          {
            foreignKeyName: "availability_tenant_id_fkey";
            columns: ["tenant_id"];
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "availability_profile_id_fkey";
            columns: ["profile_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      clock_events: {
        Row: {
          id: string;
          tenant_id: string;
          profile_id: string;
          location_id: string;
          shift_id: string | null;
          type: "clock_in" | "clock_out";
          recorded_at: string;
          latitude: number | null;
          longitude: number | null;
          accuracy_m: number | null;
          is_within_geofence: boolean | null;
          source: "mobile" | "kiosk" | "manual";
          idempotency_key: string;
          approved_at: string | null;
          approved_by: string | null;
          created_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          tenant_id: string;
          profile_id: string;
          location_id: string;
          shift_id?: string | null;
          type: "clock_in" | "clock_out";
          recorded_at?: string;
          latitude?: number | null;
          longitude?: number | null;
          accuracy_m?: number | null;
          is_within_geofence?: boolean | null;
          source?: "mobile" | "kiosk" | "manual";
          idempotency_key: string;
          approved_at?: string | null;
          approved_by?: string | null;
          created_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          tenant_id?: string;
          profile_id?: string;
          location_id?: string;
          shift_id?: string | null;
          type?: "clock_in" | "clock_out";
          recorded_at?: string;
          latitude?: number | null;
          longitude?: number | null;
          accuracy_m?: number | null;
          is_within_geofence?: boolean | null;
          source?: "mobile" | "kiosk" | "manual";
          idempotency_key?: string;
          approved_at?: string | null;
          approved_by?: string | null;
          created_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "clock_events_tenant_id_fkey";
            columns: ["tenant_id"];
            referencedRelation: "tenants";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "clock_events_profile_id_fkey";
            columns: ["profile_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "clock_events_location_id_fkey";
            columns: ["location_id"];
            referencedRelation: "locations";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "clock_events_shift_id_fkey";
            columns: ["shift_id"];
            referencedRelation: "shifts";
            referencedColumns: ["id"];
          },
          {
            foreignKeyName: "clock_events_approved_by_fkey";
            columns: ["approved_by"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
      push_tokens: {
        Row: {
          id: string;
          profile_id: string;
          expo_push_token: string;
          platform: "ios" | "android";
          created_at: string;
          updated_at: string;
          deleted_at: string | null;
        };
        Insert: {
          id?: string;
          profile_id: string;
          expo_push_token: string;
          platform: "ios" | "android";
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Update: {
          id?: string;
          profile_id?: string;
          expo_push_token?: string;
          platform?: "ios" | "android";
          created_at?: string;
          updated_at?: string;
          deleted_at?: string | null;
        };
        Relationships: [
          {
            foreignKeyName: "push_tokens_profile_id_fkey";
            columns: ["profile_id"];
            referencedRelation: "profiles";
            referencedColumns: ["id"];
          }
        ];
      };
    };
    Views: Record<string, never>;
    Functions: {
      is_tenant_member: {
        Args: { p_tenant_id: string };
        Returns: boolean;
      };
      get_tenant_role: {
        Args: { p_tenant_id: string };
        Returns: "owner" | "manager" | "employee" | null;
      };
      handle_new_user: {
        Args: Record<string, never>;
        Returns: unknown;
      };
      handle_invited_user: {
        Args: Record<string, never>;
        Returns: unknown;
      };
    };
    Enums: {
      user_role: "owner" | "manager" | "employee";
      roster_status: "draft" | "published" | "archived";
      clock_event_type: "clock_in" | "clock_out";
      clock_source: "mobile" | "kiosk" | "manual";
      plan_type: "free" | "starter";
    };
    CompositeTypes: Record<string, never>;
  };
}

// =============================================================================
// Convenience type aliases
// =============================================================================

export type Tenant = Database["public"]["Tables"]["tenants"]["Row"];
export type Location = Database["public"]["Tables"]["locations"]["Row"];
export type Profile = Database["public"]["Tables"]["profiles"]["Row"];
export type TenantMember = Database["public"]["Tables"]["tenant_members"]["Row"];
export type Roster = Database["public"]["Tables"]["rosters"]["Row"];
export type Shift = Database["public"]["Tables"]["shifts"]["Row"];
export type AvailabilityRow = Database["public"]["Tables"]["availability"]["Row"];
export type ClockEvent = Database["public"]["Tables"]["clock_events"]["Row"];
export type PushToken = Database["public"]["Tables"]["push_tokens"]["Row"];
