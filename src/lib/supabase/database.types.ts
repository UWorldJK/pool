
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[]

export type Database = {
  
  "graphql_public": {
          Tables: {
            [_ in never]: never
          }
          Views: {
            [_ in never]: never
          }
          Functions: {
            "graphql":
{ Args: { "extensions"?: Json,"operationName"?: string,"query"?: string,"variables"?: Json }; Returns: Json
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        },"public": {
          Tables: {
            "activity_events": {
                  Row: {
                    "actor_id": string | null,"created_at": string,"detail": string,"id": number,"kind": string,"ride_id": string | null,"summary": string,"team_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "actor_id"?: string | null,"created_at"?: string,"detail"?: string,"id"?: never,"kind": string,"ride_id"?: string | null,"summary": string,"team_id": string
                  }
                  Update: {
                    "actor_id"?: string | null,"created_at"?: string,"detail"?: string,"id"?: never,"kind"?: string,"ride_id"?: string | null,"summary"?: string,"team_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "activity_events_ride_id_fkey"
      columns: ["ride_id"]
isOneToOne: false
      referencedRelation: "rides"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "activity_events_team_id_fkey"
      columns: ["team_id"]
isOneToOne: false
      referencedRelation: "teams"
      referencedColumns: ["id"]
    }
                  ]
                },"children": {
                  Row: {
                    "created_at": string,"family_id": string,"first_name": string,"id": string,"last_name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"family_id": string,"first_name": string,"id"?: string,"last_name"?: string
                  }
                  Update: {
                    "created_at"?: string,"family_id"?: string,"first_name"?: string,"id"?: string,"last_name"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "children_family_id_fkey"
      columns: ["family_id"]
isOneToOne: false
      referencedRelation: "families"
      referencedColumns: ["id"]
    }
                  ]
                },"driver_approvals": {
                  Row: {
                    "approved_by": string | null,"child_id": string,"created_at": string,"driver_id": string,"id": string,"revoked_at": string | null,"revoked_by": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "approved_by"?: string | null,"child_id": string,"created_at"?: string,"driver_id": string,"id"?: string,"revoked_at"?: string | null,"revoked_by"?: string | null
                  }
                  Update: {
                    "approved_by"?: string | null,"child_id"?: string,"created_at"?: string,"driver_id"?: string,"id"?: string,"revoked_at"?: string | null,"revoked_by"?: string | null
                  }
                  Relationships: [
                    {
      foreignKeyName: "driver_approvals_child_id_fkey"
      columns: ["child_id"]
isOneToOne: false
      referencedRelation: "children"
      referencedColumns: ["id"]
    }
                  ]
                },"driver_request_approvals": {
                  Row: {
                    "decided_at": string | null,"decided_by": string | null,"decision": string | null,"family_id": string,"request_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "decided_at"?: string | null,"decided_by"?: string | null,"decision"?: string | null,"family_id": string,"request_id": string
                  }
                  Update: {
                    "decided_at"?: string | null,"decided_by"?: string | null,"decision"?: string | null,"family_id"?: string,"request_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "driver_request_approvals_family_id_fkey"
      columns: ["family_id"]
isOneToOne: false
      referencedRelation: "families"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "driver_request_approvals_request_id_fkey"
      columns: ["request_id"]
isOneToOne: false
      referencedRelation: "driver_requests"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "driver_request_approvals_request_id_fkey"
      columns: ["request_id"]
isOneToOne: false
      referencedRelation: "driver_requests_effective"
      referencedColumns: ["id"]
    }
                  ]
                },"driver_requests": {
                  Row: {
                    "created_at": string,"created_by": string | null,"driver_accepted_at": string | null,"expires_at": string,"id": string,"kind": string,"proposed_driver": string,"resolved_at": string | null,"ride_id": string,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"driver_accepted_at"?: string | null,"expires_at": string,"id"?: string,"kind": string,"proposed_driver": string,"resolved_at"?: string | null,"ride_id": string,"status"?: string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"driver_accepted_at"?: string | null,"expires_at"?: string,"id"?: string,"kind"?: string,"proposed_driver"?: string,"resolved_at"?: string | null,"ride_id"?: string,"status"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "driver_requests_ride_id_fkey"
      columns: ["ride_id"]
isOneToOne: false
      referencedRelation: "rides"
      referencedColumns: ["id"]
    }
                  ]
                },"families": {
                  Row: {
                    "created_at": string,"created_by": string | null,"id": string,"name": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"name": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"id"?: string,"name"?: string
                  }
                  Relationships: [
                    
                  ]
                },"family_members": {
                  Row: {
                    "created_at": string,"family_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"family_id": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"family_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "family_members_family_id_fkey"
      columns: ["family_id"]
isOneToOne: false
      referencedRelation: "families"
      referencedColumns: ["id"]
    }
                  ]
                },"invites": {
                  Row: {
                    "accepted_at": string | null,"accepted_by": string | null,"created_at": string,"created_by": string | null,"expires_at": string,"family_id": string | null,"id": string,"kind": string,"team_id": string | null,"token_hash": string
                  }
                  ComputedFields: never
                  Insert: {
                    "accepted_at"?: string | null,"accepted_by"?: string | null,"created_at"?: string,"created_by"?: string | null,"expires_at": string,"family_id"?: string | null,"id"?: string,"kind": string,"team_id"?: string | null,"token_hash": string
                  }
                  Update: {
                    "accepted_at"?: string | null,"accepted_by"?: string | null,"created_at"?: string,"created_by"?: string | null,"expires_at"?: string,"family_id"?: string | null,"id"?: string,"kind"?: string,"team_id"?: string | null,"token_hash"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "invites_family_id_fkey"
      columns: ["family_id"]
isOneToOne: false
      referencedRelation: "families"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "invites_team_id_fkey"
      columns: ["team_id"]
isOneToOne: false
      referencedRelation: "teams"
      referencedColumns: ["id"]
    }
                  ]
                },"profiles": {
                  Row: {
                    "created_at": string,"display_name": string,"id": string,"phone": string | null,"plate_last3": string | null,"seats": number,"updated_at": string,"vehicle": string | null
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"display_name"?: string,"id": string,"phone"?: string | null,"plate_last3"?: string | null,"seats"?: number,"updated_at"?: string,"vehicle"?: string | null
                  }
                  Update: {
                    "created_at"?: string,"display_name"?: string,"id"?: string,"phone"?: string | null,"plate_last3"?: string | null,"seats"?: number,"updated_at"?: string,"vehicle"?: string | null
                  }
                  Relationships: [
                    
                  ]
                },"ride_riders": {
                  Row: {
                    "arrived_at": string | null,"child_id": string,"handed_off_at": string | null,"handed_off_by": string | null,"picked_up_at": string | null,"ride_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "arrived_at"?: string | null,"child_id": string,"handed_off_at"?: string | null,"handed_off_by"?: string | null,"picked_up_at"?: string | null,"ride_id": string
                  }
                  Update: {
                    "arrived_at"?: string | null,"child_id"?: string,"handed_off_at"?: string | null,"handed_off_by"?: string | null,"picked_up_at"?: string | null,"ride_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "ride_riders_child_id_fkey"
      columns: ["child_id"]
isOneToOne: false
      referencedRelation: "children"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "ride_riders_ride_id_fkey"
      columns: ["ride_id"]
isOneToOne: false
      referencedRelation: "rides"
      referencedColumns: ["id"]
    }
                  ]
                },"rides": {
                  Row: {
                    "created_at": string,"created_by": string | null,"driver_id": string | null,"dropoff": string,"id": string,"pickup": string,"series_id": string | null,"starts_at": string,"status": string,"team_id": string,"title": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"driver_id"?: string | null,"dropoff": string,"id"?: string,"pickup": string,"series_id"?: string | null,"starts_at": string,"status"?: string,"team_id": string,"title": string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"driver_id"?: string | null,"dropoff"?: string,"id"?: string,"pickup"?: string,"series_id"?: string | null,"starts_at"?: string,"status"?: string,"team_id"?: string,"title"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "rides_team_id_fkey"
      columns: ["team_id"]
isOneToOne: false
      referencedRelation: "teams"
      referencedColumns: ["id"]
    }
                  ]
                },"team_children": {
                  Row: {
                    "child_id": string,"created_at": string,"team_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "child_id": string,"created_at"?: string,"team_id": string
                  }
                  Update: {
                    "child_id"?: string,"created_at"?: string,"team_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "team_children_child_id_fkey"
      columns: ["child_id"]
isOneToOne: false
      referencedRelation: "children"
      referencedColumns: ["id"]
    },{
      foreignKeyName: "team_children_team_id_fkey"
      columns: ["team_id"]
isOneToOne: false
      referencedRelation: "teams"
      referencedColumns: ["id"]
    }
                  ]
                },"team_members": {
                  Row: {
                    "created_at": string,"role": string,"team_id": string,"user_id": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"role"?: string,"team_id": string,"user_id": string
                  }
                  Update: {
                    "created_at"?: string,"role"?: string,"team_id"?: string,"user_id"?: string
                  }
                  Relationships: [
                    {
      foreignKeyName: "team_members_team_id_fkey"
      columns: ["team_id"]
isOneToOne: false
      referencedRelation: "teams"
      referencedColumns: ["id"]
    }
                  ]
                },"teams": {
                  Row: {
                    "created_at": string,"created_by": string | null,"detail": string,"id": string,"name": string,"timezone": string
                  }
                  ComputedFields: never
                  Insert: {
                    "created_at"?: string,"created_by"?: string | null,"detail"?: string,"id"?: string,"name": string,"timezone"?: string
                  }
                  Update: {
                    "created_at"?: string,"created_by"?: string | null,"detail"?: string,"id"?: string,"name"?: string,"timezone"?: string
                  }
                  Relationships: [
                    
                  ]
                }
          }
          Views: {
            "driver_requests_effective": {
                  Row: {
                    "created_at": string,"created_by": string | null,"driver_accepted_at": string | null,"effective_status": string | null,"expires_at": string,"id": string,"kind": string,"proposed_driver": string,"resolved_at": string | null,"ride_id": string,"status": string
                  }
                  ComputedFields: never
                  Insert: {
                           "created_at"?: string | null,"created_by"?: string | null,"driver_accepted_at"?: string | null,"effective_status"?: never,"expires_at"?: string | null,"id"?: string | null,"kind"?: string | null,"proposed_driver"?: string | null,"resolved_at"?: string | null,"ride_id"?: string | null,"status"?: string | null
                         }
                        Update: {
                           "created_at"?: string | null,"created_by"?: string | null,"driver_accepted_at"?: string | null,"effective_status"?: never,"expires_at"?: string | null,"id"?: string | null,"kind"?: string | null,"proposed_driver"?: string | null,"resolved_at"?: string | null,"ride_id"?: string | null,"status"?: string | null
                         }
                        Relationships: [
                    {
      foreignKeyName: "driver_requests_ride_id_fkey"
      columns: ["ride_id"]
isOneToOne: false
      referencedRelation: "rides"
      referencedColumns: ["id"]
    }
                  ]
                }
          }
          Functions: {
            "accept_invite":
{ Args: { "p_token": string }; Returns: Json
                           },
"add_child":
{ Args: { "p_first_name": string,"p_last_name": string }; Returns: string
                           },
"cancel_request":
{ Args: { "p_request": string }; Returns: undefined
                           },
"cancel_ride":
{ Args: { "p_ride": string }; Returns: undefined
                           },
"claim_ride":
{ Args: { "p_ride": string,"p_seats_confirmed": boolean }; Returns: string
                           },
"confirm_handoff":
{ Args: { "p_child": string,"p_ride": string }; Returns: undefined
                           },
"create_family":
{ Args: { "p_name": string }; Returns: string
                           },
"create_invite":
{ Args: { "p_kind": string,"p_target": string }; Returns: string
                           },
"create_rides":
{ Args: { "p_child_ids": (string)[],"p_drive"?: boolean,"p_dropoff": string,"p_local_start": string,"p_pickup": string,"p_seats_confirmed"?: boolean,"p_team": string,"p_title": string,"p_weeks"?: number }; Returns: (string)[]
                           },
"create_team":
{ Args: { "p_detail": string,"p_name": string,"p_timezone": string }; Returns: string
                           },
"decide_request":
{ Args: { "p_approve": boolean,"p_request": string }; Returns: string
                           },
"invite_preview":
{ Args: { "p_token": string }; Returns: Json
                           },
"mark_arrived":
{ Args: { "p_child": string,"p_ride": string }; Returns: undefined
                           },
"mark_picked_up":
{ Args: { "p_child": string,"p_ride": string }; Returns: undefined
                           },
"propose_driver":
{ Args: { "p_driver": string,"p_ride": string }; Returns: string
                           },
"release_ride":
{ Args: { "p_ride": string }; Returns: undefined
                           },
"respond_to_request":
{ Args: { "p_accept": boolean,"p_request": string,"p_seats_confirmed"?: boolean }; Returns: string
                           },
"set_driver_approval":
{ Args: { "p_approved": boolean,"p_child": string,"p_driver": string }; Returns: undefined
                           },
"set_team_children":
{ Args: { "p_child_ids": (string)[],"p_team": string }; Returns: undefined
                           },
"skip_ride":
{ Args: { "p_child": string,"p_ride": string }; Returns: undefined
                           },
"update_profile":
{ Args: { "p_display_name": string,"p_phone": string,"p_plate_last3": string,"p_seats": number,"p_vehicle": string }; Returns: undefined
                           }
          }
          Enums: {
            [_ in never]: never
          }
          CompositeTypes: {
            [_ in never]: never
          }
        }
}

type DatabaseWithoutInternals = Omit<Database, '__InternalSupabase'>

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
  ? (DefaultSchema["Tables"] & DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
      Row: infer R
    }
    ? R
    : never
  : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Insert: infer I
    }
    ? I
    : never
  : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never
> = DefaultSchemaTableNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
  ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
      Update: infer U
    }
    ? U
    : never
  : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never
> = DefaultSchemaEnumNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
  ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
  : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never
> = PublicCompositeTypeNameOrOptions extends { schema: keyof DatabaseWithoutInternals }
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
  ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
  : never

export const Constants = {
  "graphql_public": {
          Enums: {
            
          }
        },"public": {
          Enums: {
            
          }
        }
} as const
