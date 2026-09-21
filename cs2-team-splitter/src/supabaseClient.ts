import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://xvamjvisdbemdwfpptnk.supabase.co";
const supabaseAnonKey = "sb_publishable_gzXtKXXax2_owOQoS0RdMQ_GQOvHsMj";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
