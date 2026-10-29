import { useEffect, useState } from "react";
import { StyleSheet, Text, View } from "react-native";
import { supabase } from "@/lib/supabase";

type Status = "checking" | "ready" | "error";

export default function Index() {
  const [status, setStatus] = useState<Status>("checking");

  useEffect(() => {
    supabase.auth
      .getSession()
      .then(({ error }) => setStatus(error ? "error" : "ready"))
      .catch(() => setStatus("error"));
  }, []);

  return (
    <View style={styles.container}>
      <Text style={styles.title}>Pool</Text>
      <Text>Supabase client: {status}</Text>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    alignItems: "center",
    justifyContent: "center",
    gap: 8,
  },
  title: {
    fontSize: 32,
    fontWeight: "600",
  },
});
