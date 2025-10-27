import { Redirect } from "expo-router";

export default function RootIndex() {
  // Redirect to the login screen so users see login first
  return <Redirect href="/login" />;
}
