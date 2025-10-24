// js/workout.js
import {  query, orderByChild, equalTo, get, update, ref as dbRef } from "https://www.gstatic.com/firebasejs/11.5.0/firebase-database.js";
import { database } from "./firebaseConfig.js";



const speechQueue = [];
let isSpeaking = false;
const feedbackDisplay = document.getElementById('feedbackDisplay');

let video, counterDisplay, counterDisplay2, toggleButton, popup, nextExerciseButton;
let canvas, ctx, capturedImage, skipButton;

let isCapturing = false;
let captureInterval;
let sets = 0;
let exercises = [], name = "", totalReps = 0, totalSets = 0;
let currentIndex = 0, loggedInUserKey = "", currentPlanId = "";

let lastMessage = ""; // Stocăm ultimul mesaj afisat

export function setGlobalState(userKey, planId, exs) {
  loggedInUserKey = userKey;
  currentPlanId = planId;
  exercises = exs;
}

export function loadExercise(ex) {

  speechQueue.length = 0;
  window.speechSynthesis.cancel();
  isSpeaking = false;
  sets = 0;
  lastMessage = "";

  name = ex.name;
  totalReps = ex.reps;
  totalSets = ex.sets;

  document.getElementById("exercise-index").textContent = `${currentIndex + 1}`;
  document.getElementById("exercise-name").textContent = name;
  document.getElementById("exercise-meta").textContent = `Sets: ${totalSets} | Reps: ${totalReps} | Weight: ${ex.weight || 0}kg`;
  document.getElementById("counter-display").textContent = `0 / ${totalReps}`;
  document.getElementById("counter-display2").textContent = `0 / ${totalSets}`;
  document.getElementById("plan-btn").setAttribute("data-count", exercises.length);

  const planList = document.getElementById("plan-list");
  planList.innerHTML = `<h3>Exercise Plan</h3>` + exercises.map((e, index) => `
    <div class="plan-list-item">
        <strong>${index + 1}. ${e.name}</strong>
        <span>Sets: ${e.sets}, Reps: ${e.reps}, Weight: ${e.weight || 0}kg</span>
    </div>
    `).join('');
  
}

export function initializeCamera() {
  video = document.getElementById('video');
  counterDisplay = document.getElementById("counter-display");
  counterDisplay2 = document.getElementById("counter-display2");
  toggleButton = document.getElementById("toggle-button");
  popup = document.getElementById("popup");
  nextExerciseButton = document.getElementById("next-exercise-button");
  skipButton = document.getElementById("skip-button");
  canvas = document.createElement('canvas');
  ctx = canvas.getContext('2d');
  


  navigator.mediaDevices.getUserMedia({ video: true })
    .then((stream) => video.srcObject = stream)
    .catch((err) => console.error("Camera error:", err));

  const socket = new WebSocket("ws://localhost:8765");

  

  socket.onmessage = (event) => {
    const message = event.data;

    console.log("Mesaj primit:", message);  // Debug: Afișează mesajul primit de la server

    if (message.startsWith("FEEDBACK:")) {
        const feedbackMessage = message.replace("FEEDBACK:", "").trim();

        console.log("Feedback extrase:", feedbackMessage);  // Debug: Afișează feedback-ul extras

        // Verificăm dacă mesajul curent este diferit de cel anterior
        if (feedbackMessage !== lastMessage && feedbackMessage !== "") {
            feedbackDisplay.style.display = 'block'; 
            lastMessage = feedbackMessage; // Actualizăm ultimul mesaj
            displayFeedback(feedbackMessage); // Afișăm feedback-ul pe ecran
        }
    } else {
        // Este numărul de repetări
        const currentReps = parseInt(message, 10) - sets * totalReps;
        counterDisplay.textContent = `${currentReps} / ${totalReps}`;
        counterDisplay.classList.remove("bounce");
        void counterDisplay.offsetWidth;
        counterDisplay.classList.add("bounce");

        if (currentReps === totalReps) {
          sets++;
          counterDisplay2.textContent = `${sets} / ${totalSets}`;
          counterDisplay2.classList.remove("bounce");
          void counterDisplay2.offsetWidth;
          counterDisplay2.classList.add("bounce");

          if (sets === totalSets) {
            popup.classList.add('show');
            popup.style.display = 'block';
            toggleButton.click();
            speechQueue.length = 0; 
            window.speechSynthesis.cancel(); 
            triggerConfetti();

            const utterance = new SpeechSynthesisUtterance("You have completed the exercise.");
            utterance.lang = "en-US";
            utterance.rate = 1;
            window.speechSynthesis.speak(utterance);

          } else {
            clearInterval(captureInterval); 
            isCapturing = false;
            speechQueue.length = 0;

            const speakSetBreak = async () => {
                // 🔥 Curăță complet coada și vocea
                speechQueue.length = 0;
                window.speechSynthesis.cancel();
                isSpeaking = false;

                const messages = [
                  "Set complete.",
                  "Starting next set in 5",
                  "4",
                  "3",
                  "2",
                  "1"
                ];

                for (const msg of messages) {
                  await new Promise((resolve) => {
                    const utterance = new SpeechSynthesisUtterance(msg);
                    utterance.lang = "en-US";
                    utterance.rate = 1;
                    utterance.onend = resolve;

                    window.speechSynthesis.cancel(); // extra siguranță
                    window.speechSynthesis.speak(utterance);

                    feedbackDisplay.textContent = msg;
                    feedbackDisplay.style.display = "block";
                  });
                }

                feedbackDisplay.textContent = "";
                feedbackDisplay.style.display = "none";
                isSpeaking = false;
                processSpeechQueue(); // dacă vin mesaje noi, le afișăm după countdown

                captureInterval = setInterval(() => sendFrame(socket), 500);
                isCapturing = true;
              };


            speakSetBreak();
          }
        }

    }
};


function displayFeedback(feedbackMessage) {
  // Adăugăm mesajul în coadă și procesăm
  speechQueue.push(feedbackMessage);
  processSpeechQueue();
}

function processSpeechQueue() {
  if (isSpeaking || speechQueue.length === 0) return;

  const nextMessage = speechQueue.shift();
  const utterance = new SpeechSynthesisUtterance(nextMessage);
  utterance.lang = "en-US"; // sau "ro-RO"
  utterance.rate = 1;

  // ✅ Afișăm pe ecran când începe să vorbească
  utterance.onstart = () => {
    isSpeaking = true;
    if (feedbackDisplay) {
      feedbackDisplay.textContent = nextMessage;
      feedbackDisplay.style.display = "block";
      feedbackDisplay.classList.remove("bounce");
      void feedbackDisplay.offsetWidth;
      feedbackDisplay.classList.add("bounce");
    }
  };

  // ✅ Când se termină vorbirea, ascundem mesajul și procesăm următorul
  utterance.onend = () => {
    if (feedbackDisplay) {
      feedbackDisplay.textContent = "";
      feedbackDisplay.style.display = "none";
    }
    isSpeaking = false;
    processSpeechQueue(); // Trecem la următorul
  };

  window.speechSynthesis.cancel(); // Oprire orice vorbire precedentă
  window.speechSynthesis.speak(utterance);
}



    const planBtn = document.getElementById("plan-btn");
    const planList = document.getElementById("plan-list");

    planBtn.addEventListener("click", () => {
    planList.style.display = planList.style.display === 'none' ? 'block' : 'none';
    });


toggleButton.addEventListener("click", async () => {
  const icon = toggleButton.querySelector("i");

  if (isCapturing) {
    // Oprește captura
    clearInterval(captureInterval);
    isCapturing = false;

    icon.classList.remove("fa-pause");
    icon.classList.add("fa-play");
    toggleButton.classList.add("playing");
  } else {
    let countdown = 5;
    feedbackDisplay.style.display = "block";

    const speakCountdown = (n) => {
      return new Promise((resolve) => {
        const msg = n === 5 ? `Starting in ${n}` : `${n}`;
        feedbackDisplay.textContent = msg + "...";

        const utterance = new SpeechSynthesisUtterance(msg);
        utterance.lang = "en-US";
        utterance.rate = 1;

        utterance.onend = () => {
          resolve();
        };

        window.speechSynthesis.cancel();
        window.speechSynthesis.speak(utterance);
      });
    };

    // 🔁 Așteaptă pe rând fiecare pas al countdown-ului
    while (countdown > 0) {
      await speakCountdown(countdown);
      countdown--;
    }

    feedbackDisplay.textContent = "";
    feedbackDisplay.style.display = "none";
    isSpeaking = false;
    processSpeechQueue();

    // Începe capturarea cadrelor
    captureInterval = setInterval(() => sendFrame(socket), 500);
    isCapturing = true;

    icon.classList.remove("fa-play");
    icon.classList.add("fa-pause");
    toggleButton.classList.remove("playing");
  }
});




nextExerciseButton.addEventListener("click", () => {
    popup.style.display = 'none';
    nextExercise();
  });
  skipButton.addEventListener("click", () => {
    nextExercise();
  });
  
}

function sendFrame(socket) {
  canvas.width = video.videoWidth;
  canvas.height = video.videoHeight;
  ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
  const base64Data = canvas.toDataURL("image/jpeg", 0.5).split(',')[1];
  const message = `${name}|${base64Data}`;
  //const message = `Incline Hammer Curls|${base64Data}`;
  if (socket.readyState === WebSocket.OPEN) socket.send(message);
}

function saveProgress(exerciseName, completedSets, completedReps) {
  const exercise = exercises.find(e => e.name === exerciseName);
  if (!exercise) return;
  const updates = {};
  updates[`users/${loggedInUserKey}/Plans/${currentPlanId}/exercises/${exercise.key}/completedSets`] = completedSets;
  updates[`users/${loggedInUserKey}/Plans/${currentPlanId}/exercises/${exercise.key}/completedReps`] = completedReps;

  update(dbRef(database), updates)
    .then(() => console.log("Progress saved."))
    .catch(err => console.error("Save error:", err));
}

function nextExercise() {
  saveProgress(name, sets, sets * totalReps);
  currentIndex++;
  if (currentIndex < exercises.length) {
    loadExercise(exercises[currentIndex]);
  } else {
    alert("You have completed all exercises!");
  }
}

const viewButton = document.getElementById("view-button");
const popupOverlay = document.getElementById("exercise-popup");
const popupName = document.getElementById("popup-exercise-name");
const closePopup = document.getElementById("close-popup");
const exerciseVideo = document.getElementById("exercise-video");

viewButton.addEventListener("click", async () => {
  popupOverlay.style.display = 'flex';
  popupName.textContent = name;

  const videoId = await getVideoIdByExerciseName(name);

  if (videoId) {
    exerciseVideo.src = `https://www.youtube.com/embed/${videoId}`;
  } else {
    exerciseVideo.src = "";
    exerciseVideo.innerHTML = "Video not available.";
  }
});

closePopup.addEventListener("click", () => {
  popupOverlay.style.display = 'none';
});


function triggerConfetti() {
  const duration = 2 * 1000;
  const end = Date.now() + duration;

  const confettiCanvas = document.getElementById('confetti-canvas');

  (function frame() {
    confetti.create(confettiCanvas, {
      resize: true,
      useWorker: true,
    })({
      particleCount: 5,
      angle: 60,
      spread: 55,
      origin: { x: 0 },
    });
    confetti.create(confettiCanvas, {
      resize: true,
      useWorker: true,
    })({
      particleCount: 5,
      angle: 120,
      spread: 55,
      origin: { x: 1 },
    });

    if (Date.now() < end) {
      requestAnimationFrame(frame);
    }
  })();
}


async function getVideoIdByExerciseName(exerciseName) {
  const videosRef = dbRef(database, 'videos');
  const videosQuery = query(videosRef, orderByChild('name'), equalTo(exerciseName));

  const snapshot = await get(videosQuery);

  if (snapshot.exists()) {
    const data = snapshot.val();
    const firstKey = Object.keys(data)[0];
    return data[firstKey].videoId;
  } else {
    console.error('Nu am găsit niciun video pentru exercițiul:', exerciseName);
    return null;
  }
}