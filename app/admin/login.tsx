import React from "react";
import LoginEmailScreen from "../users/login-email";

export const options = {
  headerShown: false,
};

export default function AdminLoginScreen() {
  return (
    <LoginEmailScreen
      initialAccountType="shelter"
      allowedAccountTypes={["shelter"]}
    />
  );
}
