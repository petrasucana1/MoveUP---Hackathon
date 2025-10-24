"use client"

import React, { useState, useEffect, useRef, useMemo } from "react"
import {
  View,
  Text,
  Modal,
  Image,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from "react-native"
import { useRouter } from "expo-router"
import { LinearGradient } from "expo-linear-gradient"
import StaticLine from "../../components/lines/StaticLine"
import { Colors } from "../../constants/Colors"
import OrangeButton from "../../components/buttons/OrangeButton"
import LittlePurpleButton from "@/components/buttons/LittlePurpleButton"
import { useNavigation } from "@react-navigation/native"
import { DrawerActions } from "@react-navigation/native"
import { useLocalSearchParams } from "expo-router"

import localExercises from "../../assets/data__for_testing/exercises+video.json"
import { gql, useQuery } from "@apollo/client"

import ExerciseComponent from "@/components/ExerciseComponent"
import { TextInput } from "react-native-gesture-handler"
import { Ionicons } from "@expo/vector-icons"
import { useExerciseContext } from "../../components/ExerciseContext"
import MiniExerciseComponent from "@/components/MiniExerciseComponent"
import BodyBackSvgLittle from "../../components/svg/BodyBackSvg_little"
import BodySvgLittle from "../../components/svg/BodyBackSvg_little"

const EXERCISES_QUERY = gql`
  query exercises($muscle: String, $name: String) {
    exercises(muscle: $muscle, name: $name) {
      name
      muscle
      difficulty
      equipment
      instructions
    }
  }
`

const VIDEOS_QUERY = gql`
  query GetVideos {
    getVideos {
      name
      value { name videoId }
    }
  }
`

interface Exercise {
  Muscles: string
  WorkOut: string
  Intensity_Level: string
  Beginner_Sets: string
  Intermediate_Sets: string
  Expert_Sets: string
  Equipment: string
  Explaination: string
  Long_Explanation: string
  Video: string
}

interface ExercisesResponse {
  name: string
  muscle: string
  difficulty: string
  equipment: string
  instructions: string
}

type Rankable = {
  WorkOut: string
  Muscles: string
  Intensity_Level: string
  Equipment: string
  Explaination?: string
  Video?: string
}

function tokenize(s: string) {
  return (s || "")
    .toLowerCase()
    .normalize("NFKD")
    .replace(/[^\w\s-]/g, " ")
    .split(/\s+/)
    .filter(Boolean)
}

// NEW: robust normalizer for matching names between API and video list
function norm(s: string) {
  return (s || "")
    .toLowerCase()
    .normalize("NFKD") // strips diacritics
    .replace(/[^\p{L}\p{N}]+/gu, "") // keep only letters & digits
    .trim()
}

function scoreExercise(e: Rankable, query: string, activeMuscle?: string) {
  const qTokens = tokenize(query)
  const hay = tokenize(`${e.WorkOut} ${e.Muscles} ${e.Intensity_Level} ${e.Equipment} ${e.Explaination || ""}`)
  let score = 0

  if (activeMuscle && e.Muscles && e.Muscles.toLowerCase() === activeMuscle.toLowerCase()) {
    score += 6
  }

  const nameTokens = tokenize(e.WorkOut)
  qTokens.forEach((t) => {
    if (nameTokens.includes(t)) score += 3
    if (hay.includes(t)) score += 1
  })

  const q = query.toLowerCase()
  const diff = (e.Intensity_Level || "").toLowerCase()
  if (/beginner|începător|usor|ușor/.test(q) && /beginner|easy/.test(diff)) score += 3
  if (/intermediate|intermediar/.test(q) && /intermediate/.test(diff)) score += 3
  if (/advanced|expert|avansat|greu/.test(q) && /advanced|expert|hard/.test(diff)) score += 3

  if (e.Equipment) {
    if (/no equipment|bodyweight|home|acasa|acasă/.test(q) && /none|bodyweight|no equipment/i.test(e.Equipment))
      score += 2
    if (/dumbbell|gantere/.test(q) && /dumbbell/i.test(e.Equipment)) score += 2
    if (/barbell|bară/.test(q) && /barbell/i.test(e.Equipment)) score += 2
    if (/band|elastic|bandă/.test(q) && /band/i.test(e.Equipment)) score += 2
  }

  return score
}

function shortlist(all: Rankable[], query: string, activeMuscle?: string, limit = 10) {
  const ranked = all
    .map((x) => ({ x, s: scoreExercise(x, query, activeMuscle) }))
    .sort((a, b) => b.s - a.s)
    .filter((r) => r.s > 0)
    .slice(0, limit)
    .map((r) => r.x)

  return ranked
}

function parsePrefs(q: string) {
  const s = (q || "").toLowerCase()

  const difficulty = /beginner|începător|usor|ușor/.test(s)
    ? "beginner"
    : /intermediate|intermediar/.test(s)
      ? "intermediate"
      : /advanced|expert|avansat|greu/.test(s)
        ? "advanced"
        : ""

  const noEq = /no equipment|bodyweight|home|acasa|acasă/.test(s)
  const dumbbell = /dumbbell|gantere/.test(s)
  const barbell = /barbell|bară/.test(s)
  const band = /band|elastic|bandă/.test(s)

  const muscleTokens = [
    "chest",
    "back",
    "legs",
    "shoulders",
    "biceps",
    "triceps",
    "glutes",
    "abs",
    "core",
    "calves",
    "forearms",
    "neck",
    "piept",
    "spate",
    "picioare",
    "umeri",
    "biceps",
    "triceps",
    "fesieri",
    "abdomen",
    "gambe",
    "antebrațe",
    "gat",
    "gât",
  ].filter((m) => s.includes(m))

  const equipment = noEq ? "none" : dumbbell ? "dumbbell" : barbell ? "barbell" : band ? "band" : ""

  return { difficulty, equipment, muscleTokens }
}

function shortlistForQuery(all: Rankable[], query: string, activeMuscle?: string, limit = 12) {
  const { difficulty, equipment, muscleTokens } = parsePrefs(query)

  let pool = all

  if (difficulty) {
    pool = pool.filter((e) => (e.Intensity_Level || "").toLowerCase().includes(difficulty))
  }

  if (equipment === "none") {
    pool = pool.filter((e) => /none|no equipment|bodyweight/i.test(e.Equipment || ""))
  } else if (equipment) {
    const rx = new RegExp(equipment, "i")
    pool = pool.filter((e) => rx.test(e.Equipment || ""))
  }

  if (muscleTokens.length) {
    const hasMuscle = (e: Rankable) => muscleTokens.some((m) => (e.Muscles || "").toLowerCase().includes(m))
    const primary = pool.filter(hasMuscle)
    const secondary = pool.filter((e) => !hasMuscle(e))
    pool = primary.length ? [...primary, ...secondary] : pool
  }

  return shortlist(pool, query, undefined, limit)
}

function parseExerciseResponse(content: string) {
  const blocks = content.split(/\n\n+|\n(?=Name:)/)
  const exercises: Array<{
    name: string
    reps: string
    sets: string
    explanation: string
  }> = []

  blocks.forEach((block) => {
    const nameMatch = block.match(/Name:\s*(.+?)(?:\s*[,|\n]|$)/i)
    const repsMatch = block.match(/Reps:\s*(.+?)(?:\s*[,|\n]|$)/i)
    const setsMatch = block.match(/Sets:\s*(.+?)(?:\s*[,|\n]|$)/i)
    const explanationMatch = block.match(/Short explanation:\s*(.+?)$/is)

    if (nameMatch) {
      exercises.push({
        name: nameMatch[1].trim(),
        reps: repsMatch ? repsMatch[1].trim() : "",
        sets: setsMatch ? setsMatch[1].trim() : "",
        explanation: explanationMatch ? explanationMatch[1].trim() : "",
      })
    }
  })

  return exercises
}

const ExercisesScreen = () => {
  const router = useRouter()
  const navigation = useNavigation()
  const { selectedExercises } = useExerciseContext()
  const { selectedMuscles } = useLocalSearchParams()
  const { getExercisesCount } = useExerciseContext()

  let muscles: string[] = []
  if (typeof selectedMuscles === "string") {
    try {
      muscles = JSON.parse(selectedMuscles)
    } catch (_err) {
      muscles = (selectedMuscles as string).split(",")
    }
  } else if (Array.isArray(selectedMuscles)) {
    muscles = selectedMuscles as string[]
  }

  const [activeMuscle, setActiveMuscle] = useState(muscles[0] || "")

  const { data, refetch } = useQuery(EXERCISES_QUERY, {
    variables: { muscle: activeMuscle, name: "" },
    fetchPolicy: "cache-first",
  })
  const { data: VideosData } = useQuery(VIDEOS_QUERY, {
    variables: {},
    fetchPolicy: "cache-first",
  })

  useEffect(() => {
    refetch({ muscle: activeMuscle, name: "" })
  }, [activeMuscle])

  // NEW: build a Map of normalized name -> videoId so matching is resilient
  const videoMap = useMemo(() => {
    const m = new Map<string, string>()
    const list = (VideosData as any)?.getVideos || []
    list.forEach((video: any) => {
      const rawName = video?.value?.name ?? video?.name
      const id = video?.value?.videoId
      const key = norm(rawName)
      if (key && id) m.set(key, id)
    })
    return m
  }, [VideosData])

  const exercisesData: Exercise[] = ((data as any)?.exercises?.map((exercise: ExercisesResponse) => {
    const videoId = videoMap.get(norm(exercise.name)) || ""
    return {
      Muscles: (exercise.muscle || "").toLowerCase(),
      WorkOut: exercise.name,
      Intensity_Level: exercise.difficulty,
      Equipment: exercise.equipment,
      Explaination: exercise.instructions,
      Beginner_Sets: "3 sets of 10 reps",
      Intermediate_Sets: "4 sets of 12 reps",
      Expert_Sets: "5 sets of 15 reps",
      Long_Explanation: "This is a default long explanation.",
      Video: videoId ? `https://www.youtube.com/embed/${videoId}` : "https://www.youtube.com/embed/3cD5UFWsNOA",
    }
  }) || []) as Exercise[]

  const fallbackFromLocal: Exercise[] = Array.isArray(localExercises)
    ? (localExercises as any[]).map((ex: any) => ({
        Muscles: (ex.muscle || ex.Muscles || "").toLowerCase(),
        WorkOut: ex.name || ex.WorkOut,
        Intensity_Level: ex.difficulty || ex.Intensity_Level || "Beginner",
        Equipment: ex.equipment || ex.Equipment || "None",
        Explaination: ex.instructions || ex.Explaination || "",
        Beginner_Sets: ex.Beginner_Sets || "3 sets of 10 reps",
        Intermediate_Sets: ex.Intermediate_Sets || "4 sets of 12 reps",
        Expert_Sets: ex.Expert_Sets || "5 sets of 15 reps",
        Long_Explanation: ex.Long_Explanation || "",
        Video: ex.Video || "",
      }))
    : []

  const effectiveExercises: Exercise[] = exercisesData?.length ? exercisesData : fallbackFromLocal
  const filteredExercises = effectiveExercises?.filter(
    (exercise) => exercise.Muscles.toLowerCase() === (activeMuscle || "").toLowerCase(),
  )

  const [searchQuery, setSearchQuery] = useState("")
  const [filteredExercisesSearch, setFilteredExercisesSearch] = useState(filteredExercises)
  const [modalVisible, setModalVisible] = useState(false)

  const renderItem = React.useCallback(
    ({ item }: { item: any }) => {
      return <ExerciseComponent exercise={item} />
    },
    [filteredExercisesSearch],
  )

  const renderItemInModal = ({ item }: { item: Exercise }) => {
    return <MiniExerciseComponent exercise={item} planId="" />
  }

  const handlePressOrangeButton = () => {
    router.push("/live-screen")
  }

  const handlePress1 = (muscle: string) => {}
  const handlePressArrow = () => {
    navigation.goBack()
  }
  const handleXModal = () => {
    setModalVisible(false)
  }

  useEffect(() => {
    const base = effectiveExercises.length ? effectiveExercises : []
    const filtered = base.filter(
      (exercise) => (exercise.Muscles || "").toLowerCase() === (activeMuscle || "").toLowerCase(),
    )
    setFilteredExercisesSearch(filtered)
  }, [activeMuscle, data, VideosData]) // include VideosData so UI updates when videos arrive

  const handlePurpleButton = React.useCallback(
    (muscle: string) => {
      setActiveMuscle(muscle)
    },
    [effectiveExercises],
  )

  const handleSearch = (query: string) => {
    setSearchQuery(query)
    const base = effectiveExercises.filter(
      (e) => (e.Muscles || "").toLowerCase() === (activeMuscle || "").toLowerCase(),
    )
    if (query.trim() === "") {
      setFilteredExercisesSearch(base)
    } else {
      const filtered = base.filter((exercise) => (exercise.WorkOut || "").toLowerCase().includes(query.toLowerCase()))
      setFilteredExercisesSearch(filtered)
    }
  }

  const clearSearch = () => {
    setSearchQuery("")
    const base = effectiveExercises.filter(
      (e) => (e.Muscles || "").toLowerCase() === (activeMuscle || "").toLowerCase(),
    )
    setFilteredExercisesSearch(base)
  }

  const onToggle = () => {
    navigation.dispatch(DrawerActions.openDrawer())
  }

  const openModal = () => {
    setModalVisible(true)
  }

  const [chatModalVisible, setChatModalVisible] = useState(false)
  const [chatMessages, setChatMessages] = useState<{ role: "user" | "assistant"; content: string }[]>([
    {
      role: "assistant",
      content:
        "Hi! Tell me your preferences (muscle, difficulty, equipment) and I'll give you exercises recommendations suitable fo you. ",
    },
  ])
  const [chatInput, setChatInput] = useState("")
  const [chatSending, setChatSending] = useState(false)
  const chatListRef = useRef<FlatList>(null)
  const openChatModal = () => setChatModalVisible(true)
  const closeChatModal = () => setChatModalVisible(false)

  const LLM_API_URL = ""
  const LLM_API_KEY =""

  const chatRankables: Rankable[] = useMemo(() => {
    return (effectiveExercises || []).map((e) => ({
      WorkOut: e.WorkOut || "",
      Muscles: (e.Muscles || "").toLowerCase() || "general",
      Intensity_Level: e.Intensity_Level || "",
      Equipment: e.Equipment || "",
      Explaination: e.Explaination || "",
      Video: e.Video || "",
    }))
  }, [effectiveExercises])

  function buildPrompt(userPrompt: string) {
    const top = shortlistForQuery(chatRankables, userPrompt, undefined, 24)
    const context = top.map((e) => ({
      name: e.WorkOut,
      muscle: e.Muscles,
      difficulty: e.Intensity_Level,
      equipment: e.Equipment || "",
    }))

    const system = [
      "You are a professional fitness assistant. Respond in English.",
      "You receive user preferences and a list of candidate exercises, and you MUST choose only from that list.",
      "Create a balanced plan (5–8 items) matching the user's preferences.",
      "For readability, put EACH exercise on a NEW LINE. and after every exercise, add a newline.",
      "Return each exercise using EXACTLY this format:",
      "Name: <exercise name>  , new line,  Reps: <e.g., 10–12> ,new line, Sets: <e.g., 3> , new line, Short explanation: <one concise sentence>",
      "Do not number or bullet them. Do not add extra text before or after the list.",
      "For Muscles  you don't find exercises in the list, provide 3 exercises for that category which are not in the list, follow the format, no additional words:",
      "For readability, put EACH exercise on a NEW LINE. and after every exercise, add a newline.",
      "Return each exercise using EXACTLY this format:",
      "Name: <exercise name> , new line,  Reps: <e.g., 10–12> ,new line, Sets: <e.g., 3> , new line, Short explanation: <one concise sentence>",
    ].join(" ")

    const user = `User preferences: ${userPrompt}
Candidate exercises (JSON):
${JSON.stringify(context, null, 2)}
Choose ONLY from the list. Output 5–8 lines, each formatted exactly as:
Name: <exercise name> | Reps: <e.g., 10–12> | Sets: <e.g., 3> | Short explanation: <one concise sentence>`

    return { system, user, rawQuery: userPrompt }
  }

  async function callLLM(system: string, user: string, rawQueryForFallback: string): Promise<string> {
    if (!LLM_API_URL || !LLM_API_KEY) {
      const pool = shortlistForQuery(chatRankables, rawQueryForFallback, undefined, 40)
      const picks = pool.slice(0, Math.max(5, Math.min(8, pool.length || 0)))
      if (!picks.length) {
        return "No good matches. Try specifying muscle, difficulty, equipment, and time (e.g., 'legs, beginner, no equipment, 25 min')."
      }
      const lines = picks.map(
        (e) =>
          `Name: ${e.WorkOut} | Reps: 10–12 | Sets: 3 | Short explanation: ${e.Intensity_Level ? `${e.Intensity_Level} level; ` : ""}targets ${e.Muscles}${e.Equipment ? `; equipment: ${e.Equipment}` : ""}.`,
      )
      return lines.join("\n")
    }

    const history = chatMessages.slice(-6).map((m) => ({
      role: m.role,
      content: m.content,
    }))

    const payload = {
      model: "gpt-4o-mini",
      messages: [{ role: "system", content: system }, ...history, { role: "user", content: user }],
      temperature: 0.4,
    }

    const res = await fetch(LLM_API_URL, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(LLM_API_KEY ? { Authorization: `Bearer ${LLM_API_KEY}` } : {}),
      },
      body: JSON.stringify(payload),
    })

    if (!res.ok) {
      const text = await res.text().catch(() => "")
      throw new Error(`LLM HTTP ${res.status}: ${text}`)
    }

    try {
      const data = await res.json()
      const reply = data?.choices?.[0]?.message?.content || data?.reply || JSON.stringify(data)
      return reply
    } catch (_err) {
      throw new Error(String(_err))
    }
  }

  const handleSendChat = async () => {
    if (!chatInput.trim() || chatSending) return
    const userText = chatInput.trim()
    setChatInput("")
    setChatMessages((prev) => [...prev, { role: "user", content: userText }])
    setChatSending(true)
    try {
      const { system, user, rawQuery } = buildPrompt(userText)
      const reply = await callLLM(system, user, rawQuery)
      setChatMessages((prev) => [...prev, { role: "assistant", content: reply }])
    } catch (_err) {
      setChatMessages((prev) => [
        ...prev,
        { role: "assistant", content: `Oops, something went wrong while generating the reply.\n${String(_err)}` },
      ])
    } finally {
      setChatSending(false)
      setTimeout(() => chatListRef.current?.scrollToEnd?.({ animated: true }), 50)
    }
  }

  return (
    <LinearGradient
      colors={[Colors.white, Colors.white, Colors.white]}
      start={{ x: 0, y: 0 }}
      end={{ x: 1, y: 0 }}
      style={styles.backgroundImage}
    >
      <View style={styles.top_container}>
        <View style={styles.logo_container}>
          <TouchableOpacity onPress={handlePressArrow}>
            <Image source={require("../../assets/images/back_arrow_icon.png")} style={styles.logo} />
          </TouchableOpacity>
        </View>
        <View style={styles.sidebar_container}>
          <TouchableOpacity onPress={onToggle}>
            <Image source={require("../../assets/images/sidebar_icon.png")} style={styles.sidebar_icon} />
          </TouchableOpacity>
        </View>
      </View>

      <View style={styles.middle_container}>
        <FlatList
          data={muscles}
          renderItem={({ item }) => (
            <LittlePurpleButton
              key={item}
              onPress={() => setActiveMuscle(item)}
              title={item}
              backgroundColor={activeMuscle === item ? Colors.red : Colors.gray_blue}
              textColor={activeMuscle === item ? Colors.white : Colors.white}
            />
          )}
          keyExtractor={(item) => item}
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.flatListContent}
        />
      </View>

      <View style={{ flex: 1, marginHorizontal: 50 }}>
        <View
          style={{
            flexDirection: "row",
            alignItems: "center",
            backgroundColor: Colors.white,
            borderRadius: 50,
            borderWidth: 2,
            borderColor: Colors.dark_blue,
            paddingHorizontal: 20,
            paddingVertical: 4,
          }}
        >
          <TextInput
            placeholder="Search Exercise"
            style={{ flex: 1 }}
            autoCapitalize="none"
            autoCorrect={false}
            value={searchQuery}
            onChangeText={handleSearch}
          />
          {searchQuery.length === 0 ? (
            <Ionicons name="search" size={30} color={Colors.dark_blue} />
          ) : (
            <TouchableOpacity onPress={clearSearch}>
              <Ionicons name="close-circle" size={30} color={Colors.dark_blue} />
            </TouchableOpacity>
          )}
        </View>
      </View>

      <View style={styles.exercises_container}>
        <FlatList data={filteredExercisesSearch} renderItem={renderItem} keyExtractor={(item) => item.WorkOut} />
      </View>

      <View style={styles.bottom_screen}>
        <StaticLine />
      </View>

      <TouchableOpacity style={styles.floatingButton} onPress={openModal}>
        <Text style={styles.buttonText}>PLAN</Text>
        <View style={styles.exercisesCountBubble}>
          <Text style={styles.bubbleText}>{getExercisesCount()}</Text>
        </View>
      </TouchableOpacity>

      <TouchableOpacity style={styles.floatingChatButton} onPress={openChatModal} accessibilityLabel="Open AI chat">
        <Ionicons name="chatbubbles" size={28} color={Colors.gray_blue} />
        <Text style={[styles.buttonText, { fontSize: 14, marginTop: 4 }]}>CHAT</Text>
      </TouchableOpacity>

      <Modal
        visible={modalVisible}
        transparent={true}
        animationType="slide"
        onRequestClose={() => setModalVisible(false)}
      >
        <View style={styles.modalContainer}>
          <View style={{ alignSelf: "flex-end", marginTop: 5, marginRight: 5 }}>
            <TouchableOpacity onPress={handleXModal}>
              <Ionicons name="close-circle" size={35} color={Colors.dark_blue} />
            </TouchableOpacity>
          </View>

          <View style={{ flexDirection: "row", marginVertical: 5, marginHorizontal: 10, alignItems: "center" }}>
            <BodySvgLittle selected={muscles} onPress={handlePress1} />
            <View style={{ flex: 1, paddingHorizontal: 5 }}>
              <Text
                style={{
                  fontFamily: "Calistoga",
                  fontSize: 25,
                  color: Colors.dark_purple,
                  textAlign: "center",
                  flexShrink: 1,
                }}
              >
                This is your Today's Workout Plan
              </Text>
            </View>
            <BodyBackSvgLittle selected={muscles} onPress={handlePress1} />
          </View>

          <StaticLine />

          <View style={styles.exercises_container_modal}>
            <FlatList data={selectedExercises} renderItem={renderItemInModal} keyExtractor={(item) => item.WorkOut} />
          </View>

          <View style={styles.orange_button_modal}>
            <OrangeButton onPress={handlePressOrangeButton} title="Start Workout" />
          </View>
        </View>
      </Modal>

      <Modal visible={chatModalVisible} transparent={true} animationType="slide" onRequestClose={closeChatModal}>
        <View style={styles.modalContainer}>
          <View style={{ alignSelf: "flex-end", marginTop: 5, marginRight: 5 }}>
            <TouchableOpacity onPress={closeChatModal}>
              <Ionicons name="close-circle" size={35} color={Colors.dark_blue} />
            </TouchableOpacity>
          </View>

          <Text style={{ fontFamily: "Calistoga", fontSize: 24, color: Colors.dark_purple, marginBottom: 6 }}>
            AI Chat
          </Text>
          <StaticLine />

          <KeyboardAvoidingView behavior={Platform.OS === "ios" ? "padding" : undefined} style={styles.chatWrapper}>
            <View style={styles.chatMessages}>
              <FlatList
                ref={chatListRef}
                data={chatMessages}
                keyExtractor={(_, i) => String(i)}
                renderItem={({ item }) => {
                  if (item.role === "user") {
                    return (
                      <View style={[styles.bubble, styles.bubbleUser]}>
                        <Text style={styles.bubbleTextMsg}>{item.content}</Text>
                      </View>
                    )
                  }

                  const exercises = parseExerciseResponse(item.content)

                  if (exercises.length > 0) {
                    return (
                      <View style={[styles.bubble, styles.bubbleAssistantEnhanced]}>
                        <View style={styles.aiHeaderBadge}>
                          <Ionicons name="sparkles" size={16} color={Colors.white} />
                          <Text style={styles.aiHeaderText}>AI Recommendations</Text>
                        </View>
                        {exercises.map((ex, idx) => (
                          <View key={idx} style={styles.exerciseCard}>
                            <View style={styles.exerciseCardHeader}>
                              <View style={styles.exerciseNumberBadge}>
                                <Text style={styles.exerciseNumberText}>{idx + 1}</Text>
                              </View>
                              <Text style={styles.exerciseCardTitle}>{ex.name}</Text>
                            </View>

                            {(ex.reps || ex.sets) && (
                              <View style={styles.exerciseCardStats}>
                                {ex.sets && (
                                  <View style={styles.statBadge}>
                                    <Ionicons name="layers-outline" size={14} color={Colors.dark_purple} />
                                    <Text style={styles.statText}>{ex.sets}</Text>
                                  </View>
                                )}
                                {ex.reps && (
                                  <View style={styles.statBadge}>
                                    <Ionicons name="repeat-outline" size={14} color={Colors.dark_purple} />
                                    <Text style={styles.statText}>{ex.reps}</Text>
                                  </View>
                                )}
                              </View>
                            )}

                            {ex.explanation && <Text style={styles.exerciseCardExplanation}>{ex.explanation}</Text>}
                          </View>
                        ))}
                      </View>
                    )
                  }

                  return (
                    <View style={[styles.bubble, styles.bubbleAssistant]}>
                      <Text style={styles.bubbleTextMsg}>{item.content}</Text>
                    </View>
                  )
                }}
                contentContainerStyle={{ paddingVertical: 10, flexGrow: 1, justifyContent: "flex-end" }}
                onContentSizeChange={() => chatListRef.current?.scrollToEnd?.({ animated: true })}
                onLayout={() => chatListRef.current?.scrollToEnd?.({ animated: false })}
              />
            </View>

            <View style={styles.chatInputRow}>
              <TextInput
                placeholder="Tell me your preferences (e.g., chest, legs, beginner, no equipment, 30 min)…"
                style={styles.chatInput}
                value={chatInput}
                onChangeText={setChatInput}
                autoCapitalize="sentences"
              />
              <TouchableOpacity style={styles.chatSendBtn} onPress={handleSendChat} disabled={chatSending}>
                {chatSending ? (
                  <ActivityIndicator size="small" color={Colors.white} />
                ) : (
                  <Ionicons name="send" size={18} color={Colors.white} />
                )}
              </TouchableOpacity>
            </View>
          </KeyboardAvoidingView>
        </View>
      </Modal>
    </LinearGradient>
  )
}

const styles = StyleSheet.create({
  backgroundImage: { flex: 1 },

  top_container: { flex: 1, flexDirection: "row" },
  logo_container: { flex: 1, alignItems: "flex-start", paddingTop: 25, paddingLeft: 20 },
  sidebar_container: { flex: 1, alignItems: "flex-end", paddingTop: 30, paddingRight: 20 },

  middle_container: { flex: 1, justifyContent: "flex-start" },
  exercises_container: { flex: 10 },
  flatListContent: { paddingVertical: 10 },

  bottom_screen: { flex: 0.6, alignItems: "center", justifyContent: "flex-end", paddingBottom: 30 },

  icon: { width: 70, height: 30, resizeMode: "contain", opacity: 0.8 },
  logo: { width: 30, height: 30, resizeMode: "contain" },
  sidebar_icon: { width: 35, height: 35, resizeMode: "contain" },

  sidebar: { width: "60%", backgroundColor: Colors.white, paddingTop: 30, paddingHorizontal: 20, height: "100%" },
  menuItem: { fontSize: 18, marginVertical: 10 },

  floatingButton: {
    position: "absolute",
    bottom: 5,
    right: 10,
    backgroundColor: Colors.white,
    borderRadius: 50,
    width: 90,
    height: 90,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    borderColor: Colors.gray_blue,
    borderWidth: 5,
  },
  buttonText: { color: Colors.gray_blue, fontSize: 20, fontFamily: "Bitter" },

  exercisesCountBubble: {
    position: "absolute",
    top: -5,
    right: -5,
    backgroundColor: Colors.red,
    borderRadius: 50,
    width: 30,
    height: 30,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
  },
  bubbleText: { color: Colors.white, fontSize: 13, fontFamily: "Bitter" },

  modalContainer: {
    flex: 1,
    justifyContent: "center",
    alignItems: "center",
    backgroundColor: Colors.white,
    margin: "5%",
    borderRadius: 25,
    borderColor: Colors.gray_blue,
    borderWidth: 5,
  },
  modalContent: {
    width: "60%",
    backgroundColor: Colors.white,
    padding: 20,
    borderRadius: 50,
    alignItems: "center",
  },

  exercises_container_modal: { flex: 1, width: "95%", marginTop: 10 },
  orange_button_modal: { alignItems: "center", justifyContent: "flex-end", paddingBottom: 20, paddingTop: 20, gap: 30 },

  floatingChatButton: {
    position: "absolute",
    bottom: 5,
    left: 10,
    backgroundColor: Colors.white,
    borderRadius: 50,
    width: 90,
    height: 90,
    justifyContent: "center",
    alignItems: "center",
    elevation: 5,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.3,
    shadowRadius: 4,
    borderColor: Colors.gray_blue,
    borderWidth: 5,
  },

  chatWrapper: { flex: 1, width: "95%", marginTop: 8, marginBottom: 12 },
  chatMessages: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 16,
    borderWidth: 2,
    borderColor: Colors.gray_blue,
    paddingHorizontal: 10,
  },
  bubble: { maxWidth: "85%", marginVertical: 6, paddingVertical: 8, paddingHorizontal: 12, borderRadius: 14 },
  bubbleUser: { alignSelf: "flex-end", backgroundColor: Colors.gray_blue },
  bubbleAssistant: { alignSelf: "flex-start", backgroundColor: "#EFEFF6" },
  bubbleTextMsg: { color: Colors.dark_blue, fontSize: 14, fontFamily: "Bitter" },

  bubbleAssistantEnhanced: {
    alignSelf: "flex-start",
    backgroundColor: "#F8F9FF",
    maxWidth: "95%",
    borderWidth: 2,
    borderColor: Colors.dark_purple,
    paddingVertical: 12,
    paddingHorizontal: 14,
  },

  aiHeaderBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: Colors.dark_purple,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 20,
    alignSelf: "flex-start",
    marginBottom: 12,
    gap: 6,
  },

  aiHeaderText: {
    color: Colors.white,
    fontSize: 13,
    fontFamily: "Bitter",
    fontWeight: "600",
  },

  exerciseCard: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 12,
    marginBottom: 10,
    borderWidth: 1.5,
    borderColor: Colors.gray_blue,
    shadowColor: "#000",
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.1,
    shadowRadius: 2,
    elevation: 2,
  },

  exerciseCardHeader: {
    flexDirection: "row",
    alignItems: "center",
    marginBottom: 8,
    gap: 10,
  },

  exerciseNumberBadge: {
    backgroundColor: Colors.red,
    width: 28,
    height: 28,
    borderRadius: 14,
    justifyContent: "center",
    alignItems: "center",
  },

  exerciseNumberText: {
    color: Colors.white,
    fontSize: 14,
    fontFamily: "Bitter",
    fontWeight: "bold",
  },

  exerciseCardTitle: {
    flex: 1,
    fontSize: 16,
    fontFamily: "Bitter",
    fontWeight: "700",
    color: Colors.dark_blue,
  },

  exerciseCardStats: {
    flexDirection: "row",
    gap: 8,
    marginBottom: 8,
  },

  statBadge: {
    flexDirection: "row",
    alignItems: "center",
    backgroundColor: "#F0E6FF",
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 12,
    gap: 4,
  },

  statText: {
    fontSize: 13,
    fontFamily: "Bitter",
    color: Colors.dark_purple,
    fontWeight: "600",
  },

  exerciseCardExplanation: {
    fontSize: 13,
    fontFamily: "Bitter",
    color: Colors.dark_blue,
    lineHeight: 18,
    opacity: 0.8,
  },

  chatInputRow: { flexDirection: "row", alignItems: "center", marginTop: 10, gap: 8 },
  chatInput: {
    flex: 1,
    backgroundColor: Colors.white,
    borderRadius: 24,
    borderWidth: 2,
    borderColor: Colors.dark_blue,
    paddingHorizontal: 16,
    paddingVertical: 8,
  },
  chatSendBtn: { backgroundColor: Colors.red, paddingHorizontal: 16, paddingVertical: 10, borderRadius: 24 },
})

export default ExercisesScreen
