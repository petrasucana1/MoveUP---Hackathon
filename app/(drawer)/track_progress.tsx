import React, { useState, useEffect } from 'react';
import { View, Text, Modal, Image, StyleSheet, FlatList, TouchableOpacity, Animated } from 'react-native';
import { useRouter } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import StaticLine from '../../components/lines/StaticLine';
import { Colors } from '../../constants/Colors';
import OrangeButton from '../../components/buttons/OrangeButton';
import LittlePurpleButton from '@/components/buttons/LittlePurpleButton';
import { useNavigation } from '@react-navigation/native';
import { DrawerActions } from '@react-navigation/native';
import { useLocalSearchParams } from 'expo-router';
import MiniExerciseComponent from '@/components/MiniExerciseComponent';
import BodyBackSvgLittle from '../../components/svg/BodyBackSvg_little';
import BodySvgLittle from '../../components/svg/BodySvg_little';
import { useExerciseContext } from '../../components/ExerciseContext';
import { useUser } from '../../components/UserContext';
import { ScrollView } from 'react-native-gesture-handler';
import Ionicons from '@expo/vector-icons/Ionicons';

interface Exercise {
  Muscles: string;
  WorkOut: string;
  Intensity_Level: string;
  Beginner_Sets: string;
  Intermediate_Sets: string;
  Expert_Sets: string;
  Equipment: string;
  Explaination: string;
  Long_Explanation: string;
  Video: string;
}

interface Ex {
  name: string;
  sets: number;
  reps: number;
  completedSets: number;
  completedReps: number;
  weight?: number;
}

interface Plan {
  id: string;
  timestamp: any;
  exercises: Ex[];
}

const TrackProgressScreen = () => {
  const router = useRouter();
  const navigation = useNavigation();
  const { selectedExercises } = useExerciseContext();
  const { selectedMuscles } = useLocalSearchParams();
  const { getExercisesCount } = useExerciseContext();

  const { user } = useUser();
  const [plans, setPlans] = useState<Plan[]>([]);
  const [expandedPlan, setExpandedPlan] = useState<string | null>(null);

  useEffect(() => {
    const fetchPlans = async () => {
      try {
        const response = await fetch(
          `https://project1---flexicoach-default-rtdb.europe-west1.firebasedatabase.app/users/${user.Id}/Plans.json`
        );
        const data = await response.json();

        if (data) {
          const planList = Object.entries(data)
            .map(([planId, planData]: [string, any]) => {
              if (!planData.exercises) return null;

              const completedExercises = Object.values(planData.exercises).filter(
                (ex: any) => ex.completedSets !== undefined && ex.completedReps !== undefined
              );

              if (completedExercises.length === 0) return null;

              return {
                id: planId,
                timestamp: planData.timestamp,
                exercises: completedExercises,
              };
            })
            .filter((plan): plan is Plan => plan !== null)
            .sort((a, b) => new Date(b?.timestamp).getTime() - new Date(a?.timestamp).getTime());

          setPlans(planList);
        }
      } catch (error) {
        console.error('Error fetching plans:', error);
      }
    };

    fetchPlans();
  }, [user]);

  const toggleExpand = (planId: string) => {
    setExpandedPlan((prev) => (prev === planId ? null : planId));
  };

  const formatDate = (timestamp: string) => {
    const date = new Date(timestamp);
    return date.toLocaleDateString('en-GB');
  };

  let muscles: string[] = [];
  if (typeof selectedMuscles === 'string') {
    try {
      muscles = JSON.parse(selectedMuscles);
    } catch (e) {
      muscles = selectedMuscles.split(',');
    }
  } else if (Array.isArray(selectedMuscles)) {
    muscles = selectedMuscles;
  }

  const [activeMuscle, setActiveMuscle] = useState(muscles[0]);
  const [expandedExercises, setExpandedExercises] = useState<string[]>([]);

  const toggleExerciseDetails = (workout: string) => {
    if (expandedExercises.includes(workout)) {
      setExpandedExercises(expandedExercises.filter((item) => item !== workout));
    } else {
      setExpandedExercises([...expandedExercises, workout]);
    }
  };

  const renderItem = ({ item }: { item: Exercise }) => {
    const isExpanded = expandedExercises.includes(item.WorkOut);

    return (
      <View style={styles.exerciseContainer}>
        <View style={styles.exerciseRow}>
          <TouchableOpacity
            onPress={() => toggleExerciseDetails(item.WorkOut)}
            style={[styles.checkbox, isExpanded && styles.checkboxChecked]}
          />
          <Text style={styles.exerciseTitle}>{item.WorkOut}</Text>
        </View>
        {isExpanded && (
          <View style={styles.exerciseDetails}>
            <Text style={styles.detailText}>Sets: {item.Beginner_Sets}</Text>
          </View>
        )}
      </View>
    );
  };

  const handlePressOrangeButton = () => {
    router.push('/live-screen');
  };

  const handlePressArrow = () => {
    navigation.goBack();
  };

  const onToggle = () => {
    navigation.dispatch(DrawerActions.openDrawer());
  };

  return (
    <LinearGradient
      colors={[Colors.white, '#f8f9fc', Colors.white]}
      start={{ x: 0, y: 0 }}
      end={{ x: 0, y: 1 }}
      style={styles.backgroundImage}
    >
      <View style={styles.topContainer}>
        <TouchableOpacity onPress={handlePressArrow} style={styles.iconButton}>
          <Image source={require('../../assets/images/back_arrow_icon.png')} style={styles.logo} />
        </TouchableOpacity>

        <TouchableOpacity onPress={onToggle} style={styles.iconButton}>
          <Image source={require('../../assets/images/sidebar_icon.png')} style={styles.sidebarIcon} />
        </TouchableOpacity>
      </View>

      <View style={styles.headerContainer}>
        <Text style={styles.headerText}>Your Progress</Text>
        <Text style={styles.subHeaderText}>Track your fitness journey</Text>
      </View>

      <View style={styles.dividerContainer}>
        <StaticLine />
      </View>

      <ScrollView contentContainerStyle={styles.scrollContainer} showsVerticalScrollIndicator={false}>
        {plans.length === 0 ? (
          <View style={styles.emptyState}>
            <Ionicons name="barbell-outline" size={64} color={Colors.light_purple} />
            <Text style={styles.emptyStateText}>No workouts yet</Text>
            <Text style={styles.emptyStateSubtext}>Complete your first workout to see your progress here</Text>
          </View>
        ) : (
          plans.map((plan, index) => (
            <View key={plan.id} style={styles.planCard}>
              <TouchableOpacity style={styles.planHeader} onPress={() => toggleExpand(plan.id)} activeOpacity={0.7}>
                <View style={styles.planHeaderLeft}>
                  <View style={styles.dateBadge}>
                    <Ionicons name="calendar-outline" size={16} color={Colors.dark_blue} />
                  </View>
                  <View style={styles.planHeaderTextContainer}>
                    <Text style={styles.planLabel}>
                      {index === 0 ? 'LAST WORKOUT' : 'WORKOUT'}
                    </Text>
                    <Text style={styles.planDate}>{formatDate(plan.timestamp)}</Text>
                  </View>
                </View>
                <View style={styles.expandIconContainer}>
                  <Ionicons
                    name={expandedPlan === plan.id ? 'chevron-up' : 'chevron-down'}
                    size={24}
                    color={Colors.dark_blue}
                  />
                </View>
              </TouchableOpacity>

              {expandedPlan === plan.id && (
                <View style={styles.exerciseList}>
                  <View style={styles.exerciseListDivider} />
                  {plan.exercises.map((exercise, idx) => (
                    <View key={idx} style={styles.exerciseItem}>
                      <View style={styles.exerciseIconContainer}>
                        <Ionicons
                          name={exercise.completedSets > 0 ? 'checkmark-circle' : 'close-circle'}
                          size={28}
                          color={exercise.completedSets > 0 ? Colors.gray_blue : Colors.red}
                        />
                      </View>
                      <View style={styles.exerciseTextContainer}>
                        <Text style={styles.exerciseName}>{exercise.name}</Text>
                        <View style={styles.exerciseStatsRow}>
                          <View style={styles.statItem}>
                            <Ionicons name="repeat-outline" size={14} color="#a0aec0" />
                            <Text style={styles.exerciseDetail}>{exercise.completedSets} sets</Text>
                          </View>
                          <View style={styles.statItem}>
                            <Ionicons name="fitness-outline" size={14} color="#a0aec0" />
                            <Text style={styles.exerciseDetail}>{exercise.completedReps} reps</Text>
                          </View>
                          <View style={styles.statItem}>
                            <Ionicons name="barbell-outline" size={14} color="#a0aec0" />
                            <Text style={styles.exerciseDetail}>{exercise.weight || 0} kg</Text>
                          </View>
                        </View>
                      </View>
                    </View>
                  ))}
                </View>
              )}
            </View>
          ))
        )}
      </ScrollView>
    </LinearGradient>
  );
};

const styles = StyleSheet.create({
  backgroundImage: {
    flex: 1,
  },
  topContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 24,
    paddingTop: 50,
    paddingBottom: 20,
  },
  iconButton: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.white,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: Colors.dark_blue,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 3,
  },
  logo: {
    width: 24,
    height: 24,
    resizeMode: 'contain',
  },
  sidebarIcon: {
    width: 28,
    height: 28,
    resizeMode: 'contain',
  },
  headerContainer: {
    alignItems: 'center',
    marginBottom: 16,
    paddingHorizontal: 24,
  },
  headerText: {
    fontFamily: 'Calistoga',
    fontSize: 32,
    color: Colors.dark_blue,
    textAlign: 'center',
    marginBottom: 4,
  },
  subHeaderText: {
    fontFamily: 'Bitter',
    fontSize: 15,
    color: '#890909ff',
    textAlign: 'center',
    opacity: 0.8,
  },
  dividerContainer: {
    alignItems: 'center',
    marginBottom: 24,
  },
  scrollContainer: {
    paddingHorizontal: 20,
    paddingBottom: 40,
  },
  emptyState: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: 80,
    paddingHorizontal: 40,
  },
  emptyStateText: {
    fontFamily: 'Calistoga',
    fontSize: 22,
    color: Colors.dark_blue,
    marginTop: 16,
    marginBottom: 8,
  },
  emptyStateSubtext: {
    fontFamily: 'Bitter',
    fontSize: 15,
    color: Colors.blue_purple,
    textAlign: 'center',
    opacity: 0.7,
  },
  planCard: {
    backgroundColor: Colors.white,
    borderWidth: 2.5,
    borderColor: Colors.gray_blue,
    borderRadius: 24,
    marginBottom: 16,
    overflow: 'hidden',
    shadowColor: Colors.dark_blue,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 4,
  },
  planHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    padding: 18,
  },
  planHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  dateBadge: {
    width: 40,
    height: 40,
    borderRadius: 12,
    backgroundColor: '#f0f4ff',
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  planHeaderTextContainer: {
    flex: 1,
  },
  planLabel: {
    fontSize: 11,
    fontFamily: 'Bitter',
    color: Colors.dark_blue,
    letterSpacing: 0.5,
    marginBottom: 2,
    fontWeight: '600',
  },
  planDate: {
    fontSize: 17,
    color: Colors.dark_blue,
    fontFamily: 'Bitter',
    fontWeight: '700',
  },
  expandIconContainer: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: '#f0f4ff',
    justifyContent: 'center',
    alignItems: 'center',
  },
  exerciseList: {
    paddingTop: 8,
  },
  exerciseListDivider: {
    height: 1,
    backgroundColor: Colors.light_purple,
    marginHorizontal: 18,
    marginBottom: 12,
    opacity: 0.3,
  },
  exerciseItem: {
    backgroundColor: Colors.dark_blue,
    borderRadius: 16,
    padding: 14,
    marginHorizontal: 12,
    marginBottom: 10,
    flexDirection: 'row',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.15,
    shadowRadius: 4,
    elevation: 3,
  },
  exerciseIconContainer: {
    marginRight: 12,
  },
  exerciseTextContainer: {
    flex: 1,
  },
  exerciseName: {
    fontSize: 16,
    fontFamily: 'Bitter',
    color: Colors.white,
    fontWeight: '600',
    marginBottom: 6,
  },
  exerciseStatsRow: {
    flexDirection: 'row',
    gap: 16,
  },
  statItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  exerciseDetail: {
    fontSize: 13,
    color: '#cbd5e0',
    fontFamily: 'Bitter',
  },
  exerciseContainer: {
    marginBottom: 10,
    borderWidth: 3,
    borderColor: Colors.light_purple,
    borderRadius: 25,
    padding: 10,
    backgroundColor: Colors.white,
  },
  exerciseRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkbox: {
    width: 20,
    height: 20,
    borderWidth: 2,
    borderColor: Colors.dark_purple,
    borderRadius: 10,
    marginRight: 10,
  },
  checkboxChecked: {
    backgroundColor: Colors.red,
  },
  exerciseTitle: {
    fontSize: 16,
    fontFamily: 'Bitter',
    color: Colors.red,
  },
  exerciseDetails: {
    marginTop: 10,
  },
  detailText: {
    fontSize: 14,
    fontFamily: 'Bitter',
    color: Colors.red,
  },
});

export default TrackProgressScreen;