"use client";

import { useState, useEffect } from "react";
import { collection, getDocs, doc, getDoc, setDoc, updateDoc, arrayUnion } from "firebase/firestore";
import { db, auth } from "@/lib/firebase";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { AppShell } from "@/components/layout/AppShell";
import {
    BookOpen,
    CheckCircle2,
    PlayCircle,
    Award,
    ChevronRight,
    ArrowLeft,
    RotateCcw,
    Info,
    Clock,
    UserCheck,
    Smile,
    ListChecks,
    CupSoda,
    Brush,
    Package,
    ShieldAlert,
    ShieldCheck,
    Scale,
    HelpCircle
} from "lucide-react";
import { Badge } from "@/components/ui/badge";
import ReactMarkdown from 'react-markdown';
import { cn } from "@/lib/utils";

// --- Types ---

type ModuleType = 'lesson' | 'flashcards' | 'scenario' | 'quiz';

interface BaseModule {
    id: string;
    type: ModuleType;
    title: string;
}

interface LessonModule extends BaseModule {
    type: 'lesson';
    content: string;
}

interface Flashcard {
    front: string;
    back: string;
}

interface FlashcardsModule extends BaseModule {
    type: 'flashcards';
    cards: Flashcard[];
}

interface ScenarioState {
    text: string;
    options?: { text: string; next: string }[];
    isTerminal?: boolean;
    success?: boolean;
}

interface ScenarioModule extends BaseModule {
    type: 'scenario';
    initialState: string;
    states: Record<string, ScenarioState>;
}

interface QuizQuestion {
    question: string;
    options: string[];
    answer: string;
}

interface QuizModule extends BaseModule {
    type: 'quiz';
    questions: QuizQuestion[];
}

type TrainingModule = LessonModule | FlashcardsModule | ScenarioModule | QuizModule;

interface Course {
    id: string;
    title: string;
    description: string;
    icon: string;
    category?: 'safety' | 'standard';
    modules: TrainingModule[];
}

interface UserProgress {
    completedModules: string[]; // List of module IDs
    quizHistory: { quizId: string; score: number; total: number; timestamp: any }[];
}

// --- Icon Mapping ---
const IconMap: Record<string, any> = {
    Info, Clock, UserCheck, Smile, ListChecks, CupSoda, Broom: Brush, Package, ShieldAlert, ShieldCheck, Scale, HelpCircle
};

export default function TrainingPage() {
    const [courses, setCourses] = useState<Course[]>([]);
    const [userProgress, setUserProgress] = useState<UserProgress>({ completedModules: [], quizHistory: [] });
    const [loading, setLoading] = useState(true);

    // Navigation State
    const [activeCourse, setActiveCourse] = useState<Course | null>(null);
    const [activeModule, setActiveModule] = useState<TrainingModule | null>(null);

    useEffect(() => {
        fetchData();
    }, []);

    async function fetchData() {
        setLoading(true);
        try {
            // Fetch Courses
            const coursesSnapshot = await getDocs(collection(db, "trainingCourses"));
            const coursesData = coursesSnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() })) as Course[];
            // Sort manually if needed, or rely on seeding order (which Firestore doesn't guarantee, but usually okay for small sets)
            // For now, we'll just use them as is.
            setCourses(coursesData);

            // Fetch User Progress
            if (auth.currentUser) {
                const userDoc = await getDoc(doc(db, "users", auth.currentUser.uid));
                if (userDoc.exists()) {
                    const data = userDoc.data();
                    setUserProgress({
                        completedModules: data.completedModules || [],
                        quizHistory: data.quizHistory || []
                    });
                }
            }
        } catch (error) {
            console.error("Error fetching data:", error);
        } finally {
            setLoading(false);
        }
    }

    const markModuleComplete = async (moduleId: string) => {
        if (!auth.currentUser) return;
        if (userProgress.completedModules.includes(moduleId)) return;

        try {
            const userRef = doc(db, "users", auth.currentUser.uid);
            await setDoc(userRef, {
                completedModules: arrayUnion(moduleId)
            }, { merge: true });

            setUserProgress(prev => ({
                ...prev,
                completedModules: [...prev.completedModules, moduleId]
            }));
        } catch (error) {
            console.error("Error marking complete:", error);
        }
    };

    const handleModuleComplete = () => {
        if (activeModule) {
            markModuleComplete(activeModule.id);
            // Optional: Auto-advance or show success message
            // For now, just go back to course view
            setActiveModule(null);
        }
    };

    // --- Seeding ---
    const seedData = async () => {
        if (!confirm("Seed default training data? This will overwrite existing courses.")) return;

        const coursesData = [
            {
                "id": "introduction_to_frieznburgz",
                "title": "Introduction to Friez&Burgz",
                "description": "A welcoming overview of the brand, values, expectations and daily responsibilities.",
                "icon": "Info",
                "modules": [
                    {
                        "id": "intro_lesson_1",
                        "type": "lesson",
                        "title": "Welcome to Friez&Burgz",
                        "content": "# Welcome to Friez&Burgz\nYou are the face of the restaurant. Customers rely on you for a friendly, efficient and consistent experience.\n\nThis module explains the purpose of the handbook, your role on shift, and what it means to uphold Friez&Burgz standards.\n\nYour mission: provide fast, friendly and flawless service every day.\n"
                    },
                    {
                        "id": "intro_flashcards_1",
                        "type": "flashcards",
                        "title": "Key Concepts",
                        "cards": [
                            { "front": "Front Staff Role", "back": "Being the face of the brand—serving customers, taking orders, preparing items, keeping the area clean." },
                            { "front": "Professionalism", "back": "Maintaining a friendly tone, eye contact, and following procedures." },
                            { "front": "Consistency", "back": "Ensuring every customer receives the same high-quality service." }
                        ]
                    },
                    {
                        "id": "intro_quiz_1",
                        "type": "quiz",
                        "title": "Introduction Check",
                        "questions": [
                            {
                                "question": "What is the main goal of front staff?",
                                "options": ["Look busy", "Provide fast, friendly, flawless service", "Serve as quickly as possible"],
                                "answer": "Provide fast, friendly, flawless service"
                            }
                        ]
                    }
                ]
            },

            {
                "id": "opening_and_closing_preparation",
                "title": "Opening & Closing Preparation",
                "description": "Learn how to prepare the store each morning and close it correctly at night.",
                "icon": "Clock",
                "modules": [
                    {
                        "id": "prep_lesson_1",
                        "type": "lesson",
                        "title": "Morning Duties",
                        "content": "# Morning Duties\n• Remove chairs, open shutters, turn on TVs.\n• Clean glass surfaces.\n• Set up music depending on time.\n• Count the cash float (£150), prepare tills.\n• Turn on milkshake/coffee machines, refresh mixes.\n• Check card machines, fridge temperatures, expiry labels.\n• Update allergen sheets for specials.\n"
                    },
                    {
                        "id": "prep_lesson_2",
                        "type": "lesson",
                        "title": "Night Duties",
                        "content": "# Night Duties\n• Wipe down surfaces, sweep/mop floors.\n• Clean restrooms.\n• Restock drinks and sauce fridges using FIFO.\n• Refill all disposables.\n• Clean milkshake and coffee machines.\n• Complete end-of-day till procedure.\n• Report orders, milkshakes and dessert stock.\n"
                    },
                    {
                        "id": "prep_scenario_1",
                        "type": "scenario",
                        "title": "The Incorrect Float Scenario",
                        "initialState": "start",
                        "states": {
                            "start": {
                                "text": "You open the till and find only £110 instead of £150. What do you do?",
                                "options": [
                                    { "text": "Start service anyway.", "next": "wrong_start_service" },
                                    { "text": "Adjust the float to £150 before opening.", "next": "correct_adjust" }
                                ]
                            },
                            "wrong_start_service": {
                                "text": "Incorrect. Service cannot start without the correct float. This causes problems with change later.",
                                "isTerminal": true,
                                "success": false
                            },
                            "correct_adjust": {
                                "text": "Correct! Adjust the float before opening the store.",
                                "isTerminal": true,
                                "success": true
                            }
                        }
                    }
                ]
            },

            {
                "id": "two_person_task_distribution",
                "title": "Two-Person Shift Task Distribution",
                "description": "Understand the fair split of responsibilities between Main Cashier and Cashier.",
                "icon": "UserCheck",
                "modules": [
                    {
                        "id": "taskdist_lesson_1",
                        "type": "lesson",
                        "title": "Morning Split",
                        "content": "# Two-Person Morning Split\nMain Cashier handles tills, machines, and operational checks.\nCashier handles shutters, seating, glass cleaning, and mixes.\n\nBoth: commit to efficient teamwork.\n"
                    },
                    {
                        "id": "taskdist_quiz_1",
                        "type": "quiz",
                        "title": "Task Distribution Check",
                        "questions": [
                            {
                                "question": "Who is responsible for verifying the cash float?",
                                "options": ["Cashier", "Main Cashier", "Either staff member"],
                                "answer": "Main Cashier"
                            }
                        ]
                    }
                ]
            },

            {
                "id": "customer_service_and_sales",
                "title": "Customer Service & Sales",
                "description": "Master the customer experience and upselling techniques.",
                "icon": "Smile",
                "modules": [
                    {
                        "id": "cs_lesson_1",
                        "type": "lesson",
                        "title": "Customer Service Basics",
                        "content": "# Customer Service\n• Smile and make eye contact.\n• Never turn your back on a customer.\n• Use friendly tone and posture.\n• Keep the counter clean.\n• Encourage conversation when quiet.\n"
                    },
                    {
                        "id": "cs_lesson_2",
                        "type": "lesson",
                        "title": "Upselling Script",
                        "content": "# Upselling Script\n• Offer bacon or pastrami.\n• Suggest sides like fillets or corn bites.\n• Offer drinks, cheesecakes, milkshakes, coffee.\n• Ask about loyalty cards.\n• Always upsell before payment.\n"
                    },
                    {
                        "id": "cs_flashcards_1",
                        "type": "flashcards",
                        "title": "Sales Flashcards",
                        "cards": [
                            { "front": "Opening Line", "back": "Hello! Welcome to Friez&Burgz. How’s your day going?" },
                            { "front": "Best Extras", "back": "Bacon or Pastrami." },
                            { "front": "Side Options", "back": "Fillets, Fries, Corn Bites." }
                        ]
                    },
                    {
                        "id": "cs_scenario_1",
                        "type": "scenario",
                        "title": "Correct Upselling",
                        "initialState": "start",
                        "states": {
                            "start": {
                                "text": "Customer orders a burger. What do you do next?",
                                "options": [
                                    { "text": "Say nothing and wait for payment.", "next": "wrong_no_upsell" },
                                    { "text": "Offer bacon or pastrami.", "next": "correct_offer" }
                                ]
                            },
                            "wrong_no_upsell": {
                                "text": "Incorrect. Upselling is required.",
                                "isTerminal": true,
                                "success": false
                            },
                            "correct_offer": {
                                "text": "Correct! You offer extras before payment.",
                                "isTerminal": true,
                                "success": true
                            }
                        }
                    }
                ]
            },

            {
                "id": "order_pass_management",
                "title": "Order PASS Management",
                "description": "How to manage order flow and customer pickups effectively.",
                "icon": "ListChecks",
                "modules": [
                    {
                        "id": "pass_lesson_1",
                        "type": "lesson",
                        "title": "PASS Rules",
                        "content": "# PASS Management\n• Prioritise passing orders when boxes are building up.\n• Call numbers clearly.\n• Keep PASS clean.\n• Double-check accuracy before handing out.\n• During busy periods, communicate clearly between staff.\n"
                    },
                    {
                        "id": "pass_scenario_1",
                        "type": "scenario",
                        "title": "The Busy Lunch Scenario",
                        "initialState": "start",
                        "states": {
                            "start": {
                                "text": "The PASS has 3 burgers waiting and you're mid-order. What do you do?",
                                "options": [
                                    { "text": "Finish the current order first.", "next": "correct_finish" },
                                    { "text": "Stop the order immediately.", "next": "wrong_interrupt" }
                                ]
                            },
                            "correct_finish": {
                                "text": "Correct. Finish the order, then pass all waiting items.",
                                "isTerminal": true,
                                "success": true
                            },
                            "wrong_interrupt": {
                                "text": "Incorrect. Interrupting creates errors.",
                                "isTerminal": true,
                                "success": false
                            }
                        }
                    }
                ]
            },

            {
                "id": "milkshake_and_coffee_making",
                "title": "Milkshake & Coffee Making",
                "description": "Learn exact recipes, machine use and cleaning routines.",
                "icon": "CupSoda",
                "modules": [
                    {
                        "id": "milkshake_lesson",
                        "type": "lesson",
                        "title": "Milkshake Recipes",
                        "content": "# Milkshake Making\nCovers vanilla, chocolate, strawberry, banana and weekly specials.\nFollow precise ingredients, portion sizes, blending rules, expiry checks and presentation standards.\n"
                    },
                    {
                        "id": "coffee_lesson",
                        "type": "lesson",
                        "title": "Coffee Machine Use",
                        "content": "# Coffee Machine\n• Use programmed buttons.\n• Froth milk automatically.\n• Refill beans, milk, water.\n• Clean machine daily.\n"
                    },
                    {
                        "id": "milkcoffee_quiz",
                        "type": "quiz",
                        "title": "Drink Making Check",
                        "questions": [
                            {
                                "question": "When should milkshake machines be cleaned?",
                                "options": ["Once a week", "Nightly", "Whenever staff remember"],
                                "answer": "Nightly"
                            }
                        ]
                    }
                ]
            },

            {
                "id": "cleaning_and_organisation",
                "title": "Cleaning & Organisation",
                "description": "Everything needed to maintain hygiene and presentation standards.",
                "icon": "Broom",
                "modules": [
                    {
                        "id": "cleaning_lesson_1",
                        "type": "lesson",
                        "title": "Cleaning During Service",
                        "content": "# Cleaning Standards\n• Wipe tables after each customer.\n• Sweep floors regularly.\n• Replace bin bags when half full.\n• Keep condiment stations tidy.\n• Check restrooms hourly.\n"
                    },
                    {
                        "id": "cleaning_flashcards",
                        "type": "flashcards",
                        "title": "Cleaning Essentials",
                        "cards": [
                            { "front": "FIFO", "back": "First In, First Out. Always rotate stock." },
                            { "front": "Restroom Rule", "back": "Check once every hour." }
                        ]
                    }
                ]
            },

            {
                "id": "food_prep_packaging_and_bag_stamping",
                "title": "Food Prep, Packaging & Bag Stamping",
                "description": "Learn correct packaging, tray prep, dessert handling and bag stamping.",
                "icon": "Package",
                "modules": [
                    {
                        "id": "packaging_lesson",
                        "type": "lesson",
                        "title": "Burger Boxes & Trays",
                        "content": "# Packaging\n• Cut greaseproof paper.\n• Prep boxes and trays in advance.\n• Dishwash trays correctly.\n"
                    },
                    {
                        "id": "dessert_lesson",
                        "type": "lesson",
                        "title": "Dessert Handling & Labelling",
                        "content": "# Desserts\n• Decorate cheesecakes correctly.\n• Follow shelf-life rules.\n• Use FIFO in dessert fridge.\n• Report remaining stock daily.\n"
                    },
                    {
                        "id": "bagstamp_lesson",
                        "type": "lesson",
                        "title": "Bag Stamping",
                        "content": "# Bag Stamping\n• Stamp bags in advance.\n• Keep area clean.\n• Maintain supply for two days.\n"
                    }
                ]
            },

            {
                "id": "everyday_rules_and_policies",
                "title": "Everyday Rules & Policies",
                "description": "Covers phones, breaks, meals, hygiene, punctuality and cash handling.",
                "icon": "ShieldAlert",
                "modules": [
                    {
                        "id": "rules_lesson_1",
                        "type": "lesson",
                        "title": "Daily Rules",
                        "content": "# Daily Rules\n• No phones except breaks.\n• One free staff meal (no cheesecake/milkshake).\n• Break rules for full vs half shifts.\n• Arrive early enough to open by 11:45.\n• Keep enough change in till.\n"
                    },
                    {
                        "id": "rules_scenario_1",
                        "type": "scenario",
                        "title": "The Phone on Shift Scenario",
                        "initialState": "start",
                        "states": {
                            "start": {
                                "text": "Your phone vibrates while serving a customer. What do you do?",
                                "options": [
                                    { "text": "Check it quickly under the counter.", "next": "wrong_check" },
                                    { "text": "Ignore it until break time.", "next": "correct_ignore" }
                                ]
                            },
                            "wrong_check": {
                                "text": "Incorrect. Phone usage is not allowed.",
                                "isTerminal": true,
                                "success": false
                            },
                            "correct_ignore": {
                                "text": "Correct. Phones are only allowed during breaks.",
                                "isTerminal": true,
                                "success": true
                            }
                        }
                    }
                ]
            },

            {
                "id": "performance_and_disciplinary_process",
                "title": "Performance Standards & Disciplinary Process",
                "description": "Learn how the store evaluation system works and how staff behaviour is monitored.",
                "icon": "Scale",
                "modules": [
                    {
                        "id": "performance_lesson",
                        "type": "lesson",
                        "title": "Store Evaluation System",
                        "content": "# Store Evaluation\n• Stores start with 100 points.\n• Deductions for missed standards.\n• Repeated issues double deductions.\n• Scores <70 require corrective action.\n"
                    },
                    {
                        "id": "discipline_lesson",
                        "type": "lesson",
                        "title": "Disciplinary Path",
                        "content": "# Disciplinary Path\n1. Verbal warning.\n2. Written warning.\n3. Final warning.\n4. Termination.\n\nSerious misconduct = immediate action.\n"
                    },
                    {
                        "id": "discipline_quiz",
                        "type": "quiz",
                        "title": "Policy Check",
                        "questions": [
                            {
                                "question": "What happens if an issue is repeated on the next evaluation?",
                                "options": ["Nothing", "Deduction doubles", "Staff are fired"],
                                "answer": "Deduction doubles"
                            }
                        ]
                    }
                ]
            },

            {
                "id": "allergen_management",
                "title": "Allergen Management",
                "description": "Critical procedures for handling allergens and ensuring customer safety.",
                "icon": "ShieldAlert",
                "category": "safety",
                "modules": [
                    {
                        "id": "allergen_procedure",
                        "type": "lesson",
                        "title": "6-Step Allergen Procedure",
                        "content": "# 6-Step Allergen Procedure\n\n## Step 1: Ask & Listen\n* Always ask customers if they have any allergies or dietary restrictions.\n* Listen carefully to their needs. Repeat the information back to them to ensure it's correct.\n\n## Step 2: Check the Allergen Matrix\n* Consult the up-to-date allergen matrix for the requested menu item.\n* Never guess. If you are unsure, ask a manager.\n\n## Step 3: Inform the Customer\n* Clearly communicate the allergen information to the customer.\n* Inform them about potential cross-contamination risks if applicable.\n\n## Step 4: Order with Clear Instructions\n* Use the \"Allergy Alert\" function on the till.\n* Add clear, specific notes to the order for the kitchen staff (e.g., \"NO BUN - Celiac Allergy\").\n\n## Step 5: Clean Down & Change Gloves\n* Before preparing an allergy-safe meal, wash hands thoroughly.\n* Clean all surfaces and utensils that will be used.\n* Change into a fresh pair of gloves.\n\n## Step 6: Deliver the Meal Separately\n* The allergy-safe meal should be delivered to the table separately from other meals to avoid cross-contamination.\n* The person who took the order or a manager should deliver the meal and confirm with the customer that it is the allergy-safe dish."
                    },
                    {
                        "id": "allergen_script_scenario",
                        "type": "scenario",
                        "title": "Customer Interaction",
                        "initialState": "start",
                        "states": {
                            "start": {
                                "text": "Customer: 'Hi, I have a gluten allergy. What can I eat?'",
                                "options": [
                                    { "text": "Check the matrix immediately.", "next": "check_matrix" },
                                    { "text": "Guess that the burger is fine.", "next": "fail_guess" }
                                ]
                            },
                            "check_matrix": {
                                "text": "You check the matrix. The burger patty is GF, but the bun is not. Fries are safe.",
                                "options": [
                                    { "text": "Offer burger without bun or GF bun.", "next": "success" }
                                ]
                            },
                            "fail_guess": {
                                "text": "Never guess! You could cause a serious reaction.",
                                "isTerminal": true,
                                "success": false
                            },
                            "success": {
                                "text": "Perfect. You ensured the customer's safety.",
                                "isTerminal": true,
                                "success": true
                            }
                        }
                    },
                    {
                        "id": "allergen_clean_down",
                        "type": "lesson",
                        "title": "Clean Down Checklist",
                        "content": "**Allergy-Safe Clean Down Checklist**\n\n* [ ] **Wash Hands:** Wash hands thoroughly with soap and water for at least 20 seconds.\n* [ ] **Change Gloves:** Put on a new, clean pair of disposable gloves.\n* [ ] **Sanitize Surfaces:** Use a designated allergen-safe sanitizer to wipe down the food preparation area.\n* [ ] **Separate Utensils:** Use clean, sanitized utensils.\n* [ ] **Use Designated Equipment:** If available, use the purple-handled 'allergy-safe' equipment.\n* [ ] **Avoid Cross-Contamination:** Keep ingredients separate.\n* [ ] **Final Check:** Ensure no cross-contamination has occurred."
                    },
                    {
                        "id": "allergen_quiz",
                        "type": "quiz",
                        "title": "Allergen Safety Quiz",
                        "questions": [
                            {
                                "question": "What is the very first step when a customer informs you of an allergy?",
                                "options": ["Tell them what they can't eat", "Listen carefully and repeat their needs", "Get a manager"],
                                "answer": "Listen carefully and repeat their needs"
                            },
                            {
                                "question": "Where must you check for allergen information?",
                                "options": ["Ask a colleague", "The main menu", "The up-to-date allergen matrix"],
                                "answer": "The up-to-date allergen matrix"
                            },
                            {
                                "question": "How should an allergy-safe meal be delivered?",
                                "options": ["On the same tray", "Separately from other meals, with confirmation", "By any staff member"],
                                "answer": "Separately from other meals, with confirmation"
                            }
                        ]
                    }
                ]
            }
        ];

        try {
            for (const course of coursesData) {
                await setDoc(doc(db, "trainingCourses", course.id), course);
            }
            alert("Seeding complete! Refreshing...");
            fetchData();
        } catch (e) {
            console.error(e);
            alert("Seeding failed.");
        }
    };

    const seedAdvancedAllergenData = async () => {
        const advancedCourse: Course = {
            id: "advanced_allergen_management",
            title: "Advanced Allergen Management",
            description: "Master level training on anaphylaxis, cross-contact prevention, and emergency response.",
            icon: "ShieldCheck",
            category: "safety",
            modules: [
                {
                    id: "adv_anaphylaxis",
                    type: "lesson",
                    title: "Understanding Anaphylaxis",
                    content: "# Anaphylaxis: A Life-Threatening Reaction\n\n## What is it?\nAnaphylaxis is a severe, potentially life-threatening allergic reaction. It can occur within seconds or minutes of exposure to an allergen.\n\n## Common Symptoms\n*   **Skin:** Hives, itching, flushed or pale skin.\n*   **Respiratory:** Wheezing, shortness of breath, throat tightness.\n*   **Cardiovascular:** Weak pulse, dizziness, fainting.\n*   **Gastrointestinal:** Nausea, vomiting, diarrhea.\n\n## Emergency Response\n1.  **Call 999 immediately.**\n2.  Ask if the customer has an auto-injector (EpiPen).\n3.  Lay the person flat (unless they are struggling to breathe).\n4.  Do not offer food or drink."
                },
                {
                    id: "adv_cross_contact",
                    type: "lesson",
                    title: "Advanced Cross-Contact Prevention",
                    content: "# Beyond the Basics: Cross-Contact\n\n## Fryers\n*   Oil shares flavors and *allergens*.\n*   **NEVER** cook allergen-free items in a fryer that has cooked allergens (e.g., breaded chicken).\n*   Use the dedicated Gluten-Free fryer for GF fries.\n\n## Grills & Hotplates\n*   Designate specific zones for allergens (e.g., cheese, eggs).\n*   Clean thoroughly between orders if space is limited.\n\n## Storage\n*   Store allergens on **lower shelves** to prevent spills onto other foods.\n*   Keep allergen-containing ingredients in tightly sealed, clearly labeled containers."
                },
                {
                    id: "adv_scenario_myth",
                    type: "scenario",
                    title: "The 'Little Bit' Myth",
                    initialState: "start",
                    states: {
                        start: {
                            text: "Customer: 'I'm allergic to peanuts, but I can have a little bit. Is the satay sauce okay?'",
                            options: [
                                { text: "Serve the sauce but warn them.", next: "fail_warn" },
                                { text: "Refuse to serve the allergen.", next: "success_refuse" }
                            ]
                        },
                        fail_warn: {
                            text: "Incorrect. As a business, we cannot knowingly serve an allergen to someone who has declared an allergy, even if they say it's okay. The risk of liability and harm is too high.",
                            isTerminal: true,
                            success: false
                        },
                        success_refuse: {
                            text: "Correct. Politely explain: 'For your safety, I cannot serve you this item as it contains peanuts. Let me recommend a safe alternative.'",
                            isTerminal: true,
                            success: true
                        }
                    }
                },
                {
                    id: "adv_quiz",
                    type: "quiz",
                    title: "Advanced Safety Certification",
                    questions: [
                        {
                            question: "What is the first step in an anaphylactic emergency?",
                            options: ["Give water", "Call 999", "Find a manager"],
                            answer: "Call 999"
                        },
                        {
                            question: "Can you cook GF fries in the same oil as onion rings?",
                            options: ["Yes, the heat kills allergens", "No, cross-contact will occur", "Only if the oil is hot enough"],
                            answer: "No, cross-contact will occur"
                        },
                        {
                            question: "Where should allergens be stored in the fridge?",
                            options: ["Top shelf", "Eye level", "Bottom shelf"],
                            answer: "Bottom shelf"
                        }
                    ]
                }
            ]
        };

        try {
            await setDoc(doc(db, "trainingCourses", advancedCourse.id), advancedCourse);
            alert("Advanced Allergen Course Added!");
            fetchData();
        } catch (e) {
            console.error(e);
            alert("Failed to add course.");
        }
    };

    // --- Sub-Components ---

    const LessonView = ({ module, onComplete }: { module: LessonModule, onComplete: () => void }) => {
        // Pre-process content
        // 1. Remove the first H1 if it exists to avoid double headings with the CardTitle
        let processedContent = module.content.replace(/^\s*#\s+[^\n]*(\n|$)/, '');

        // 2. Fix lists and headings spacing
        processedContent = processedContent
            .replace(/•/g, '\n- ') // Replace bullets with markdown dashes
            .replace(/([^\n])\n(#{1,6})/g, '$1\n\n$2') // Ensure headings have space above
            .replace(/(#{1,6} .*)\n([^\n])/g, '$1\n\n$2'); // Ensure headings have space below

        return (
            <div className="space-y-6">
                <div className="max-w-none">
                    <ReactMarkdown
                        components={{
                            h1: ({ node, ...props }) => <h1 className="text-3xl font-black text-brand-red mb-6 font-fraunces border-b border-border pb-4" {...props} />,
                            h2: ({ node, ...props }) => <h2 className="text-2xl font-bold text-brand-dark mt-8 mb-4 flex items-center gap-2 font-fraunces" {...props} />,
                            h3: ({ node, ...props }) => <h3 className="text-xl font-bold text-brand-dark mt-6 mb-3" {...props} />,
                            p: ({ node, ...props }) => <p className="text-text-primary mb-4 leading-relaxed text-lg" {...props} />,
                            ul: ({ node, ...props }) => <ul className="space-y-3 mb-6 pl-1" {...props} />,
                            li: ({ node, ...props }) => (
                                <li className="flex items-start gap-3 text-text-primary text-lg">
                                    <span className="mt-2 h-2 w-2 rounded-full bg-brand-red flex-shrink-0 shadow-sm" />
                                    <span className="flex-1">{props.children}</span>
                                </li>
                            ),
                            strong: ({ node, ...props }) => <strong className="font-bold text-brand-dark bg-brand-khaki/20 px-1 rounded" {...props} />,
                            blockquote: ({ node, ...props }) => <blockquote className="border-l-4 border-brand-khaki pl-4 italic text-text-muted my-6" {...props} />,
                        }}
                    >
                        {processedContent}
                    </ReactMarkdown>
                </div>
                <Button onClick={onComplete} className="w-full bg-brand-red text-white h-12 text-lg font-bold shadow-md hover:shadow-lg transition-all mt-8">
                    <CheckCircle2 className="mr-2 h-5 w-5" /> Mark as Complete
                </Button>
            </div>
        );
    };

    const FlashcardsView = ({ module, onComplete }: { module: FlashcardsModule, onComplete: () => void }) => {
        const [currentIndex, setCurrentIndex] = useState(0);
        const [isFlipped, setIsFlipped] = useState(false);

        const handleNext = () => {
            setIsFlipped(false);
            if (currentIndex < module.cards.length - 1) {
                setCurrentIndex(prev => prev + 1);
            } else {
                onComplete();
            }
        };

        const card = module.cards[currentIndex];

        return (
            <div className="space-y-8 text-center">
                <div className="text-sm text-text-muted">Card {currentIndex + 1} of {module.cards.length}</div>
                <div
                    className="h-64 w-full cursor-pointer group perspective-1000"
                    onClick={() => setIsFlipped(!isFlipped)}
                    style={{ perspective: '1000px' }}
                >
                    <div
                        className={cn(
                            "relative w-full h-full transition-transform duration-500 transform-style-3d border rounded-xl shadow-lg",
                            isFlipped ? "rotate-y-180" : ""
                        )}
                        style={{ transformStyle: 'preserve-3d', transform: isFlipped ? 'rotateY(180deg)' : 'rotateY(0deg)' }}
                    >
                        {/* Front (visible when not flipped) */}
                        <div
                            className="absolute inset-0 backface-hidden bg-white rounded-xl flex flex-col items-center justify-center p-8"
                            style={{ backfaceVisibility: 'hidden' }}
                        >
                            <h3 className="text-2xl font-bold text-brand-dark">{card.front}</h3>
                            <p className="text-sm text-text-muted mt-4">(Click to flip)</p>
                        </div>

                        {/* Back (visible when flipped) */}
                        <div
                            className="absolute inset-0 backface-hidden rotate-y-180 bg-brand-khaki rounded-xl flex flex-col items-center justify-center p-8"
                            style={{ backfaceVisibility: 'hidden', transform: 'rotateY(180deg)' }}
                        >
                            <p className="text-xl font-medium text-brand-dark">{card.back}</p>
                        </div>
                    </div>
                </div>
                <Button onClick={handleNext} className="w-full">
                    {currentIndex < module.cards.length - 1 ? "Next Card" : "Finish"}
                </Button>
            </div>
        );
    };

    const ScenarioView = ({ module, onComplete }: { module: ScenarioModule, onComplete: () => void }) => {
        const [currentStateId, setCurrentStateId] = useState(module.initialState);
        const currentState = module.states[currentStateId];

        if (!currentState) return <div>Error: State not found</div>;

        return (
            <div className="space-y-6">
                <div className="bg-surface p-6 rounded-lg border border-border">
                    <p className="text-lg font-medium">{currentState.text}</p>
                </div>

                {currentState.isTerminal ? (
                    <div className="space-y-4">
                        {currentState.success ? (
                            <div className="p-4 bg-green-100 text-green-800 rounded-lg flex items-center gap-2">
                                <CheckCircle2 className="h-5 w-5" /> Scenario Complete!
                            </div>
                        ) : (
                            <div className="p-4 bg-red-100 text-red-800 rounded-lg flex items-center gap-2">
                                <ShieldAlert className="h-5 w-5" /> Try Again
                            </div>
                        )}
                        <Button
                            onClick={currentState.success ? onComplete : () => setCurrentStateId(module.initialState)}
                            className={currentState.success ? "bg-brand-red text-white" : "bg-brand-dark text-white"}
                        >
                            {currentState.success ? "Finish Module" : "Restart Scenario"}
                        </Button>
                    </div>
                ) : (
                    <div className="grid gap-3">
                        {currentState.options?.map((opt, idx) => (
                            <Button
                                key={idx}
                                variant="outline"
                                className="justify-start h-auto py-3 px-4 text-left whitespace-normal"
                                onClick={() => setCurrentStateId(opt.next)}
                            >
                                {opt.text}
                            </Button>
                        ))}
                    </div>
                )}
            </div>
        );
    };

    const QuizView = ({ module, onComplete }: { module: QuizModule, onComplete: () => void }) => {
        const [answers, setAnswers] = useState<Record<number, string>>({});
        const [submitted, setSubmitted] = useState(false);
        const [score, setScore] = useState(0);

        const handleSubmit = () => {
            let s = 0;
            module.questions.forEach((q, idx) => {
                if (answers[idx] === q.answer) s++;
            });
            setScore(s);
            setSubmitted(true);
        };

        if (submitted) {
            return (
                <div className="text-center py-8 space-y-4">
                    <Award className="h-16 w-16 text-brand-khaki mx-auto" />
                    <h3 className="text-2xl font-bold text-brand-dark">Quiz Complete!</h3>
                    <p className="text-xl">You scored <span className="font-bold text-brand-red">{score}</span> / {module.questions.length}</p>
                    <Button onClick={onComplete}>Finish</Button>
                </div>
            );
        }

        return (
            <div className="space-y-8">
                {module.questions.map((q, idx) => (
                    <div key={idx} className="space-y-3">
                        <h4 className="font-bold text-lg">{idx + 1}. {q.question}</h4>
                        <div className="space-y-2">
                            {q.options.map((opt, optIdx) => (
                                <div
                                    key={optIdx}
                                    className={cn(
                                        "p-3 rounded-lg border cursor-pointer transition-all",
                                        answers[idx] === opt ? "border-brand-red bg-brand-red/5 ring-1 ring-brand-red" : "border-border hover:bg-surface-hover"
                                    )}
                                    onClick={() => setAnswers(prev => ({ ...prev, [idx]: opt }))}
                                >
                                    {opt}
                                </div>
                            ))}
                        </div>
                    </div>
                ))}
                <Button
                    onClick={handleSubmit}
                    disabled={Object.keys(answers).length !== module.questions.length}
                    className="w-full bg-brand-red text-white"
                >
                    Submit Quiz
                </Button>
            </div>
        );
    };

    // --- Main Render ---

    if (activeModule) {
        return (
            <AppShell>
                <div className="max-w-3xl mx-auto pb-20">
                    <Button variant="ghost" onClick={() => setActiveModule(null)} className="mb-4 pl-0 hover:pl-2 transition-all">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to Course
                    </Button>
                    <Card>
                        <CardHeader>
                            <div className="flex items-center justify-between">
                                <CardTitle className="font-fraunces text-2xl">{activeModule.title}</CardTitle>
                                <Badge variant="outline" className="uppercase">{activeModule.type}</Badge>
                            </div>
                        </CardHeader>
                        <CardContent>
                            {activeModule.type === 'lesson' && <LessonView module={activeModule} onComplete={handleModuleComplete} />}
                            {activeModule.type === 'flashcards' && <FlashcardsView module={activeModule} onComplete={handleModuleComplete} />}
                            {activeModule.type === 'scenario' && <ScenarioView module={activeModule} onComplete={handleModuleComplete} />}
                            {activeModule.type === 'quiz' && <QuizView module={activeModule} onComplete={handleModuleComplete} />}
                        </CardContent>
                    </Card>
                </div>
            </AppShell>
        );
    }

    if (activeCourse) {
        return (
            <AppShell>
                <div className="max-w-3xl mx-auto pb-20">
                    <Button variant="ghost" onClick={() => setActiveCourse(null)} className="mb-4 pl-0 hover:pl-2 transition-all">
                        <ArrowLeft className="mr-2 h-4 w-4" /> Back to All Courses
                    </Button>

                    <div className="mb-8">
                        <h1 className="font-fraunces text-3xl font-black text-brand-dark tracking-tight mb-2">{activeCourse.title}</h1>
                        <p className="text-text-muted">{activeCourse.description}</p>
                    </div>

                    <div className="space-y-4">
                        {activeCourse.modules.map((module, idx) => {
                            const isComplete = userProgress.completedModules.includes(module.id);
                            const Icon = module.type === 'quiz' ? Award : (module.type === 'flashcards' ? RotateCcw : (module.type === 'scenario' ? PlayCircle : BookOpen));

                            return (
                                <Card
                                    key={module.id}
                                    className={cn(
                                        "cursor-pointer hover:shadow-md transition-all group",
                                        isComplete ? "border-l-4 border-l-green-500" : (activeCourse.category === 'safety' ? "border-l-4 border-l-brand-khaki" : "border-l-4 border-l-brand-red")
                                    )}
                                    onClick={() => setActiveModule(module)}
                                >
                                    <CardContent className="p-4 flex items-center justify-between">
                                        <div className="flex items-center gap-4">
                                            <div className={cn(
                                                "h-10 w-10 rounded-full flex items-center justify-center",
                                                isComplete ? "bg-green-100 text-green-600" : "bg-surface-hover text-brand-dark"
                                            )}>
                                                {isComplete ? <CheckCircle2 className="h-5 w-5" /> : <span className="font-bold font-oswald">{idx + 1}</span>}
                                            </div>
                                            <div>
                                                <h3 className="font-bold text-brand-dark group-hover:text-brand-red transition-colors">{module.title}</h3>
                                                <p className="text-xs text-text-muted capitalize flex items-center gap-1">
                                                    <Icon className="h-3 w-3" /> {module.type}
                                                </p>
                                            </div>
                                        </div>
                                        <ChevronRight className="h-5 w-5 text-text-muted group-hover:translate-x-1 transition-transform" />
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                </div>
            </AppShell>
        );
    }

    return (
        <AppShell>
            <div className="space-y-8 pb-20">
                <div className="flex justify-between items-center">
                    <div>
                        <h1 className="font-fraunces text-3xl font-black text-brand-dark tracking-tight">Staff Training</h1>
                        <p className="text-text-muted font-medium">Interactive courses to master your role.</p>
                    </div>
                    <div className="flex gap-2">
                        <Button variant="ghost" size="sm" onClick={seedData} className="opacity-20 hover:opacity-100">
                            Seed Data
                        </Button>
                        <Button variant="outline" size="sm" onClick={seedAdvancedAllergenData} className="text-brand-khaki border-brand-khaki hover:bg-brand-khaki/10">
                            Seed Advanced Allergen
                        </Button>
                    </div>
                </div>

                {loading ? (
                    <p>Loading...</p>
                ) : (
                    <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                        {courses.length === 0 && <p className="text-text-muted italic col-span-full">No courses found. Click 'Seed Data'.</p>}
                        {courses.map(course => {
                            const Icon = IconMap[course.icon] || HelpCircle;
                            const totalModules = course.modules.length;
                            const completedCount = course.modules.filter(m => userProgress.completedModules.includes(m.id)).length;
                            const progress = Math.round((completedCount / totalModules) * 100) || 0;

                            const isSafety = course.category === 'safety';
                            const activeColorClass = isSafety ? "bg-brand-khaki text-brand-dark" : "bg-brand-red text-white";
                            const hoverColorClass = isSafety ? "group-hover:bg-brand-khaki group-hover:text-brand-dark" : "group-hover:bg-brand-red group-hover:text-white";
                            const barColorClass = isSafety ? "bg-brand-khaki" : "bg-brand-red";

                            return (
                                <Card
                                    key={course.id}
                                    className="cursor-pointer hover:shadow-lg hover:-translate-y-1 transition-all group flex flex-col"
                                    onClick={() => setActiveCourse(course)}
                                >
                                    <CardHeader>
                                        <div className={cn(
                                            "h-12 w-12 rounded-xl flex items-center justify-center mb-4 transition-colors",
                                            isSafety ? "bg-brand-khaki/20 text-brand-khaki" : "bg-brand-red/10 text-brand-red",
                                            hoverColorClass
                                        )}>
                                            <Icon className="h-6 w-6" />
                                        </div>
                                        <CardTitle className={cn("font-fraunces text-xl", isSafety && "text-brand-dark")}>{course.title}</CardTitle>
                                        <CardDescription className="line-clamp-2">{course.description}</CardDescription>
                                    </CardHeader>
                                    <CardContent className="mt-auto">
                                        <div className="flex items-center justify-between text-sm text-text-muted mb-2">
                                            <span>{progress}% Complete</span>
                                            <span>{completedCount}/{totalModules} Modules</span>
                                        </div>
                                        <div className="h-2 w-full bg-surface-hover rounded-full overflow-hidden">
                                            <div
                                                className={cn("h-full transition-all duration-500", barColorClass)}
                                                style={{ width: `${progress}%` }}
                                            />
                                        </div>
                                    </CardContent>
                                </Card>
                            );
                        })}
                    </div>
                )}
            </div>
        </AppShell>
    );
}
