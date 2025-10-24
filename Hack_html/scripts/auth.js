// js/auth.js
import { ref, get } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-database.js";
import { database } from "./firebaseConfig.js";
import { initializeCamera, loadExercise, setGlobalState } from "./workout.js";

const loginButton = document.getElementById("login-button");

loginButton.addEventListener("click", async () => {
  const email = document.getElementById("email").value;
  const password = document.getElementById("password").value;

  const usersRef = ref(database, 'users');
  const snapshot = await get(usersRef);

  if (!snapshot.exists()) {
    alert("Eroare la accesarea bazei de date!");
    return;
  }

  let userFound = false;

  snapshot.forEach(childSnapshot => {
    const userData = childSnapshot.val();

    if (userData.Email === email && userData.Password === password) {
      userFound = true;
      const loggedInUserKey = childSnapshot.key;
      const userPlans = userData.Plans || {};

      let mostRecentPlan = null;
      let mostRecentTimestamp = 0;
      let currentPlanId = "";

      Object.entries(userPlans).forEach(([planId, plan]) => {
        const timestamp = new Date(plan.timestamp).getTime();
        if (timestamp > mostRecentTimestamp) {
          mostRecentTimestamp = timestamp;
          mostRecentPlan = plan;
          currentPlanId = planId;
        }
      });

      if (mostRecentPlan) {
        const exercises = Object.entries(mostRecentPlan.exercises).map(([key, e]) => ({ key, ...e }));
        setGlobalState(loggedInUserKey, currentPlanId, exercises);
        loadExercise(exercises[0]);
      }

      document.getElementById("login-form").style.display = 'none';
      document.getElementById("login-title").style.display = 'none';
      document.getElementById("logo").style.display = 'none';

      // Arată doar popup-ul de avertizare
      document.getElementById("intro-popup").style.display = "flex";

      // Așteaptă click pe OK înainte de a continua
      document.getElementById("intro-ok-button").addEventListener("click", () => {
        document.getElementById("intro-popup").style.display = "none";
        document.getElementById("main-ui").style.display = "flex";
        document.getElementById("bottom-bar").style.display = "flex";
  initializeCamera(); // PORNEȘTE camera abia acum
});

    }
  });

  if (!userFound) {
    document.getElementById("error-message").style.display = 'block';
  }
});
