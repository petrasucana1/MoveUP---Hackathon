import React, { useEffect, useState } from "react";
import { View, Text, TextInput, Image, StyleSheet } from "react-native";
import { Link, useRouter } from "expo-router";
import { LinearGradient } from "expo-linear-gradient";
import StaticLine from "../components/lines/StaticLine";
import { Colors } from "../constants/Colors";
import PurpleButton from "../components/buttons/PurpleButton";
import { gql, useLazyQuery } from "@apollo/client";
import { useUser } from "../components/UserContext";

// -----------------------
// GraphQL
// -----------------------
const GET_USER_BY_EMAIL = gql`
  query GetUserByEmail($email: String!) {
    getUserByEmail(Email: $email) {
      name
      value {
        Email
        FirstName
        Gender
        LastName
        Password
      }
    }
  }
`;

// -----------------------
// Component
// -----------------------
const LoginScreen = () => {
  const router = useRouter();
  const { setUser, setScreen } = useUser();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [errorMessage, setErrorMessage] = useState("");

  const [fetchUser, { data: userData, loading: userLoading, error: userError }]
    = useLazyQuery(GET_USER_BY_EMAIL, { fetchPolicy: "network-only" });

  useEffect(() => {
    if (!errorMessage) return;
    const t = setTimeout(() => setErrorMessage(""), 2000);
    return () => clearTimeout(t);
  }, [errorMessage]);

  const handlePress = async () => {
    // Basic validation
    if (!email.trim() || !password.trim()) {
      setErrorMessage("All fields are required.");
      return;
    }

    try {
      const { data } = await fetchUser({ variables: { email: email.trim() } });

      const matches = data?.getUserByEmail ?? [];
      if (!Array.isArray(matches) || matches.length === 0) {
        setErrorMessage("Invalid email");
        return;
      }

      const userRec = matches[0];
      const storedPass = userRec?.value?.Password ?? "";
      if (storedPass !== password) {
        setErrorMessage("Invalid password");
        return;
      }

      // Persist user in context
      setUser({
        Id: userRec.name,
        Email: userRec.value.Email,
        FirstName: userRec.value.FirstName,
        Gender: userRec.value.Gender,
        LastName: userRec.value.LastName,
        Password: userRec.value.Password,
      });

      setScreen("home_1");
      router.push("/(drawer)/home_1");
    } catch (e) {
      setErrorMessage("Something went wrong. Please try again.");
      console.error(e);
    }
  };

  return (
    <LinearGradient
      colors={[Colors.white, Colors.white, Colors.white]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.backgroundImage}
    >
      <View style={styles.logo_container}>
        <Image
          source={require("../assets/images/logo-partial.png")}
          style={styles.logo}
        />
      </View>

      <View style={styles.container}>
        <Image
          source={require("../assets/images/user_icon.png")}
          style={styles.icon}
        />

        <View style={styles.input_container}>
          {!!errorMessage && <Text style={styles.errorMessage}>{errorMessage}</Text>}

          {!!userError && (
            <Text style={styles.errorMessage}>Network error. Try again.</Text>
          )}

          <TextInput
            style={styles.input}
            placeholder="E-mail"
            placeholderTextColor={Colors.gray_blue}
            keyboardType="email-address"
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="emailAddress"
            onChangeText={setEmail}
            value={email}
          />

          <TextInput
            style={styles.input}
            placeholder="Password"
            placeholderTextColor={Colors.gray_blue}
            secureTextEntry
            autoCapitalize="none"
            autoCorrect={false}
            textContentType="password"
            onChangeText={setPassword}
            value={password}
          />

          <Link href="/start-screen" style={styles.link}>
            Forgot password?
          </Link>
        </View>

        <PurpleButton onPress={handlePress} title={userLoading ? "LOADING..." : "LOGIN"} />
      </View>

      <View style={styles.bottom}>
        <Text style={styles.text}>
          Don't have an account?{"  "}
          <Link href="/trainingByChoice_signup" style={styles.link2}>
            Sign up now
          </Link>
        </Text>
        <StaticLine />
      </View>
    </LinearGradient>
  );
};

// -----------------------
// Styles
// -----------------------
const styles = StyleSheet.create({
  backgroundImage: { flex: 1 },
  logo_container: {
    flex: 1,
    alignItems: "flex-start",
    padding: 5,
  },
  container: {
    flex: 1,
    alignItems: "center",
    padding: 30,
    gap: 40,
    justifyContent: "center",
    marginBottom: 20,
  },
  input_container: {
    padding: 30,
    backgroundColor: Colors.dark_blue,
    borderWidth:1.5,
    width: "100%",
    borderRadius: 45,
    gap: 20,
    alignItems: "center",
  },
  errorMessage: {
    color: Colors.red,
    fontSize: 14,
    fontFamily: "Montserrat",
    marginBottom: 10,
    textAlign: "center",
  },
  bottom: {
    flex: 1,
    alignItems: "center",
    justifyContent: "flex-end",
    paddingBottom: 30,
    gap: 30,
  },
  icon: {
    width: 100,
    height: 100,
    resizeMode: "contain",
  },
  logo: {
    width: 120,
    height: 100,
    resizeMode: "contain",
  },
  input: {
    height: 50,
    borderColor: Colors.black_blue,
    borderWidth: 0.7,
    paddingHorizontal: 15,
    width: "100%",
    borderRadius: 25,
    fontFamily: "Montserrat",
    fontSize: 17,
    color: Colors.dark_blue,
    textDecorationLine: "none",
    backgroundColor: Colors.white,
  },
  text: {
    color: Colors.dark_blue,
    fontSize: 16,
    fontFamily: "Montserrat",
  },
  link: {
    color: Colors.white,
    fontSize: 16,
    fontFamily: "Montserrat",
  },
  link2: {
    color: Colors.red,
    fontSize: 16,
    fontFamily: "Montserrat",
  },
});

export default LoginScreen;
