document.addEventListener('DOMContentLoaded', () => {
    // --- DOM elemek lekérdezése ---
    const difficultySelectionScreen = document.getElementById('difficulty-selection');
    const quizScreen = document.getElementById('quiz-screen');
    const resultScreen = document.getElementById('result-screen');
    const overlay = document.getElementById('overlay');
    const modal = document.getElementById('modal');
    const modalTitle = document.getElementById('modal-title');
    const modalContent = document.getElementById('modal-content');
    const audienceChart = document.getElementById('audience-chart');
    const closeModalBtn = document.getElementById('close-modal-btn');

    const questionText = document.getElementById('question-text');
    const answerButtonsElement = document.getElementById('answer-buttons');
    const scoreDisplay = document.getElementById('score');
    const finalScoreDisplay = document.getElementById('final-score');
    const correctAnswersCountDisplay = document.getElementById('correct-answers-count');
    const currentQuestionNumberDisplay = document.getElementById('current-question-number');
    const totalQuestionsCountDisplay = document.getElementById('total-questions-count');
    const lifeDisplay = document.getElementById('life-display'); 
    const backToMenuBtn = document.getElementById('back-to-menu-btn'); 

    const difficultyButtons = document.querySelectorAll('.difficulty-btn');
    const restartButton = document.getElementById('restart-btn');

    const fiftyFiftyBtn = document.getElementById('fifty-fifty-btn');
    const phoneBtn = document.getElementById('phone-btn');
    const audienceBtn = document.getElementById('audience-btn');

    // Képelemek lekérdezése az index.html-ből
    const winImage = document.getElementById('win-image');
    const loseImage = document.getElementById('lose-image');

    // --- Játék állapot változók ---
    const MAX_QUESTIONS = 20; // 20 kérdés limit
    const STARTING_LIVES = 3; // 3 élet
    let allQuestions = {}; 
    let currentQuestions = []; 
    let currentQuestionIndex = 0;
    let score = 0;
    let correctAnswers = 0;
    let selectedDifficulty = '';
    let isAnswerBlocked = false; 
    let lives = STARTING_LIVES; 

    // Segítő funkciók állapotai (egyszer használatosak)
    let fiftyFiftyUsed = false;
    let phoneUsed = false;
    let audienceUsed = false;

    // --- Kezdeti inicializálás ---
    loadQuestions(); 

    // Eseményfigyelők
    difficultyButtons.forEach(button => {
        button.addEventListener('click', () => {
            if (Object.keys(allQuestions).length > 0) {
                startGame(button.dataset.difficulty);
            } else {
                alert("A kérdések még betöltés alatt vannak, vagy hiba történt. Kérem várjon!");
            }
        });
    });

    restartButton.addEventListener('click', () => {
        location.reload(); // Teljes oldal újratöltés
    });
    backToMenuBtn.addEventListener('click', resetGame); 
    closeModalBtn.addEventListener('click', closeModal);

    fiftyFiftyBtn.addEventListener('click', () => {
        if (!fiftyFiftyUsed && !isAnswerBlocked) {
            useFiftyFifty();
        }
    });
    phoneBtn.addEventListener('click', () => {
        if (!phoneUsed && !isAnswerBlocked) {
            usePhoneAFriend();
        }
    });
    audienceBtn.addEventListener('click', () => {
        if (!audienceUsed && !isAnswerBlocked) {
            useAudiencePoll();
        }
    });

    // --- Fő funkciók ---

    /**
     * Betölti a kérdéseket a teszt.json fájlól.
     */
    async function loadQuestions() {
        try {
            const response = await fetch('teszt.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            allQuestions = await response.json();
            console.log("Kérdések sikeresen betöltve!", allQuestions);
            if (Object.keys(allQuestions).length === 0 || 
                !allQuestions.easy || !allQuestions.medium || !allQuestions.hard ||
                allQuestions.easy.length === 0 || allQuestions.medium.length === 0 || allQuestions.hard.length === 0) {
                document.getElementById('game-title').textContent = "HIBA: Nincsenek kérdések! Kérjük, ellenőrizze a 'teszt.json' fájlt.";
                difficultySelectionScreen.style.display = 'none'; 
                return;
            }
            showScreen(difficultySelectionScreen); 
        } catch (error) {
            console.error("Hiba a kérdések betöltésekor:", error);
            document.getElementById('game-title').textContent = "Hiba történt a kérdések betöltésekor. Kérjük, ellenőrizze a console-t.";
            difficultySelectionScreen.style.display = 'none'; 
        }
    }

    /**
     * Megjelenít egy adott képernyőt, elrejtve a többit.
     */
    function showScreen(screenToShow) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        screenToShow.classList.add('active');
    }

    /**
     * Elindítja a játékot a kiválasztott nehézségi szinttel.
     */
    function startGame(difficulty) {
        selectedDifficulty = difficulty;
        
        const availableQuestions = shuffleArray([...allQuestions[difficulty]]); 
        currentQuestions = availableQuestions.slice(0, MAX_QUESTIONS); 

        currentQuestionIndex = 0;
        score = 0;
        correctAnswers = 0;
        lives = STARTING_LIVES; 
        
        fiftyFiftyUsed = false;
        phoneUsed = false;
        audienceUsed = false;
        updateHelpButtonStates();
        updateLifeDisplay(); 

        scoreDisplay.textContent = score;
        totalQuestionsCountDisplay.textContent = currentQuestions.length; 
        
        // Képek elrejtése a játék indításakor
        winImage.classList.add('hidden');
        loseImage.classList.add('hidden');
        winImage.src = ''; 
        loseImage.src = ''; 

        showScreen(quizScreen);
        displayQuestion();
    }

    /**
     * Megjeleníti az aktuális kérdést és válaszlehetőségeket.
     */
    function displayQuestion() {
        if (currentQuestionIndex >= currentQuestions.length) {
            endGame(true); 
            return;
        }
        if (lives <= 0) {
            endGame(false); 
            return;
        }
        
        isAnswerBlocked = false; 

        while (answerButtonsElement.firstChild) {
            answerButtonsElement.removeChild(answerButtonsElement.firstChild);
        }

        const question = currentQuestions[currentQuestionIndex];
        questionText.textContent = question.question;
        currentQuestionNumberDisplay.textContent = currentQuestionIndex + 1;

        const shuffledOptions = shuffleArray([...question.options]);

        shuffledOptions.forEach(option => {
            const button = document.createElement('button');
            button.textContent = option;
            button.classList.add('answer-btn');
            button.addEventListener('click', () => selectAnswer(option));
            answerButtonsElement.appendChild(button);
        });
    }

    /**
     * Kezeli a felhasználó által kiválasztott választ.
     */
    function selectAnswer(selectedOption) {
        if (isAnswerBlocked) return; 
        isAnswerBlocked = true;

        const question = currentQuestions[currentQuestionIndex];
        const isCorrect = selectedOption === question.correctAnswer;
        const answerButtons = Array.from(answerButtonsElement.children);

        answerButtons.forEach(button => {
            button.disabled = true; 
            if (button.textContent === question.correctAnswer) {
                button.classList.add('correct'); 
            } else if (button.textContent === selectedOption) {
                button.classList.add('wrong'); 
            }
        });

        if (isCorrect) {
            score += 10;
            correctAnswers++;
        } else {
            lives--;
            updateLifeDisplay();
        }
        scoreDisplay.textContent = score;

        setTimeout(() => {
            if (lives <= 0 || currentQuestionIndex + 1 >= currentQuestions.length) {
                 endGame(lives > 0); 
            } else {
                currentQuestionIndex++;
                displayQuestion(); 
            }
        }, 1500); 
    }

    /**
     * Befejezi a játékot és megjeleníti az eredményeket, beleértve a képet is.
     * @param {boolean} hasWon - Igaz, ha minden kérdésre válaszolt és maradt élete, hamis, ha elfogytak az életek.
     */
    function endGame(hasWon) {
        const titleElement = resultScreen.querySelector('h2');
        
        // Képek elrejtése minden játék végén
        winImage.classList.add('hidden');
        loseImage.classList.add('hidden');
        winImage.src = ''; 
        loseImage.src = '';

        let imageToDisplay;
        let imageFileName;

        if (lives <= 0) {
            titleElement.textContent = "Nagyon kikaptál! Tanár úr csalódott benned!";
            imageToDisplay = loseImage;
            imageFileName = 'lose.png';
        } else if (hasWon) {
            titleElement.textContent = "Gratulálunk! Nagyon megnyerted. Tanár úr büszke rád!";
            imageToDisplay = winImage;
            imageFileName = 'win.png';
        } else {
            titleElement.textContent = "Játék vége!";
            showScreen(resultScreen);
            return; 
        }
        
        finalScoreDisplay.textContent = score;
        correctAnswersCountDisplay.textContent = correctAnswers;

        // A kép betöltésének aszinkron kezelése és méretkorlátozás kényszerítése
        if (imageToDisplay && imageFileName) {
            imageToDisplay.src = imageFileName;
            
            imageToDisplay.onload = () => {
                imageToDisplay.style.maxWidth = '300px'; 
                imageToDisplay.style.maxHeight = '250px'; 
                imageToDisplay.style.width = 'auto'; 
                imageToDisplay.style.height = 'auto';

                imageToDisplay.classList.remove('hidden'); 
                showScreen(resultScreen); 
            };
            
            imageToDisplay.onerror = () => {
                console.error(`Hiba a kép betöltésekor: ${imageFileName}`);
                imageToDisplay.classList.add('hidden'); 
                showScreen(resultScreen); 
            };

        } else {
            showScreen(resultScreen);
        }
    }

    /**
     * Visszaállítja a játékot a kezdeti állapotba.
     */
    function resetGame() {
        // Képek elrejtése és törlése
        winImage.classList.add('hidden');
        loseImage.classList.add('hidden');
        winImage.src = '';
        loseImage.src = '';
        
        // Cím visszaállítása
        const titleElement = resultScreen.querySelector('h2');
        titleElement.textContent = "Játék vége!";
        
        // Pontszámok és értékek visszaállítása
        finalScoreDisplay.textContent = '0';
        correctAnswersCountDisplay.textContent = '0';
        
        showScreen(difficultySelectionScreen);
    }

    /**
     * Frissíti a segítő gombok aktív/inaktív állapotát.
     */
    function updateHelpButtonStates() {
        fiftyFiftyBtn.disabled = fiftyFiftyUsed;
        phoneBtn.disabled = phoneUsed;
        audienceBtn.disabled = audienceUsed;
    }

    /**
     * Frissíti az életek kijelzőjét (szív ikonokat).
     */
    function updateLifeDisplay() {
        lifeDisplay.innerHTML = '';
        for (let i = 0; i < STARTING_LIVES; i++) {
            const heartIcon = document.createElement('i');
            heartIcon.classList.add('fas', 'fa-heart');
            if (i >= lives) {
                heartIcon.classList.add('lost');
            }
            lifeDisplay.appendChild(heartIcon);
        }
    }

    // --- Segítő funkciók ---

    /**
     * 50:50 segítség használata.
     */
    function useFiftyFifty() {
        if (fiftyFiftyUsed) return;
        fiftyFiftyUsed = true;
        updateHelpButtonStates();

        const question = currentQuestions[currentQuestionIndex];
        const wrongOptions = question.options.filter(opt => opt !== question.correctAnswer);
        
        const optionsToRemove = [];
        while (optionsToRemove.length < 2 && wrongOptions.length > (2 - optionsToRemove.length)) { 
            const randomIndex = Math.floor(Math.random() * wrongOptions.length);
            optionsToRemove.push(wrongOptions.splice(randomIndex, 1)[0]);
        }

        Array.from(answerButtonsElement.children).forEach(button => {
            if (optionsToRemove.includes(button.textContent)) {
                button.style.visibility = 'hidden'; 
                button.disabled = true; 
            }
        });
    }

    /**
     * Telefonos segítség használata.
     */
    function usePhoneAFriend() {
        if (phoneUsed) return;
        phoneUsed = true;
        updateHelpButtonStates();

        const question = currentQuestions[currentQuestionIndex];
        let tip = '';
        const randomNumber = Math.random(); 

        let correctChance = 0.7;
        if (selectedDifficulty === 'easy') correctChance = 0.9;
        if (selectedDifficulty === 'hard') correctChance = 0.5;

        if (randomNumber < correctChance) {
            tip = `A barátod szerint a helyes válasz valószínűleg: <strong>${question.correctAnswer}</strong>`;
        } else {
            const wrongOptions = question.options.filter(opt => opt !== question.correctAnswer);
            const randomWrong = wrongOptions.length > 0 ? wrongOptions[Math.floor(Math.random() * wrongOptions.length)] : question.correctAnswer;
            tip = `A barátod a <strong>${randomWrong}</strong> választ javasolja, de nem teljesen biztos benne.`;
        }
        
        showModal('Telefonos segítség', tip, false); 
    }

    /**
     * Közönségszavazás segítség használata.
     */
    function useAudiencePoll() {
        if (audienceUsed) return;
        audienceUsed = true;
        updateHelpButtonStates();

        const question = currentQuestions[currentQuestionIndex];
        const results = {};
        let totalPercentage = 100;

        let correctPercentage = 70; 
        if (selectedDifficulty === 'easy') correctPercentage = 85;
        if (selectedDifficulty === 'hard') correctPercentage = 55;

        const visibleOptions = Array.from(answerButtonsElement.children)
                                    .filter(btn => btn.style.visibility !== 'hidden' && !btn.disabled) 
                                    .map(btn => btn.textContent);

        const availableOptions = question.options.filter(opt => visibleOptions.includes(opt));
        
        if (availableOptions.includes(question.correctAnswer)) {
            results[question.correctAnswer] = correctPercentage;
            totalPercentage -= correctPercentage;
        } else {
            correctPercentage = 0; 
        }

        const wrongOptions = availableOptions.filter(opt => opt !== question.correctAnswer);
        let remainingOptionsCount = wrongOptions.length;

        wrongOptions.forEach((option, index) => {
            if (index < remainingOptionsCount - 1) {
                let allocated = Math.floor(Math.random() * (totalPercentage / remainingOptionsCount * 1.5 - 5)) + 5; 
                allocated = Math.min(allocated, totalPercentage); 
                results[option] = allocated;
                totalPercentage -= allocated;
            } else {
                results[option] = Math.max(0, totalPercentage); 
            }
        });

        const currentSum = Object.values(results).reduce((a, b) => a + b, 0);
        if (currentSum !== 100 && currentSum > 0) { 
            const adjustmentFactor = 100 / currentSum;
            for (const key in results) {
                results[key] = Math.round(results[key] * adjustmentFactor);
            }
        }
        
        let pollMessage = "<strong>Közönségszavazás eredménye:</strong><br>";
        availableOptions.forEach(option => {
            const percentage = results[option] || 0;
            pollMessage += `${option}: <strong>${percentage}%</strong><br>`;
        });
        
        showModal('Közönségszavazás', pollMessage, false); 
    }

    /**
     * Megjeleníti a modális ablakot.
     */
    function showModal(title, content, showChart = false) {
        modalTitle.textContent = title;
        modalContent.style.display = 'block';
        audienceChart.style.display = 'none';
        modalContent.innerHTML = content; 
        audienceChart.innerHTML = ''; 
        
        overlay.classList.add('active');
    }

    /**
     * Bezárja a modális ablakot.
     */
    function closeModal() {
        overlay.classList.remove('active');
    }

    // --- Segéd függvények ---

    /**
     * Keveri a tömb elemeit (Fisher-Yates shuffle algoritmus).
     */
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }

});

