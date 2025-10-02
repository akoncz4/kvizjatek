document.addEventListener('DOMContentLoaded', () => {
    // DOM elemek lekérdezése
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

    const difficultyButtons = document.querySelectorAll('.difficulty-btn');
    const restartButton = document.getElementById('restart-btn');

    const fiftyFiftyBtn = document.getElementById('fifty-fifty-btn');
    const phoneBtn = document.getElementById('phone-btn');
    const audienceBtn = document.getElementById('audience-btn');

    // Játék állapot változók
    let allQuestions = {}; // Ide töltjük be a JSON kérdéseket
    let currentQuestions = []; // A kiválasztott nehézség kérdései
    let currentQuestionIndex = 0;
    let score = 0;
    let correctAnswers = 0;
    let selectedDifficulty = '';
    let isAnswerBlocked = false; // Megakadályozza a többszöri kattintást

    // Segítő funkciók állapotai (egyszer használatosak)
    let fiftyFiftyUsed = false;
    let phoneUsed = false;
    let audienceUsed = false;

    // --- Kezdeti inicializálás ---
    loadQuestions(); // Betölti a kérdéseket JSON-ből

    // Eseményfigyelők
    difficultyButtons.forEach(button => {
        button.addEventListener('click', () => startGame(button.dataset.difficulty));
    });

    restartButton.addEventListener('click', resetGame);
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
     * Betölti a kérdéseket a questions.json fájlból.
     */
    async function loadQuestions() {
        try {
            const response = await fetch('questions.json');
            if (!response.ok) {
                throw new Error(`HTTP error! status: ${response.status}`);
            }
            allQuestions = await response.json();
            console.log("Kérdések sikeresen betöltve!", allQuestions);
            // Ha nincsenek kérdések, hibaüzenet
            if (Object.keys(allQuestions).length === 0 || 
                !allQuestions.easy || !allQuestions.medium || !allQuestions.hard ||
                allQuestions.easy.length === 0 || allQuestions.medium.length === 0 || allQuestions.hard.length === 0) {
                document.getElementById('game-title').textContent = "HIBA: Nincsenek kérdések! Kérjük, ellenőrizze a 'questions.json' fájlt.";
                difficultySelectionScreen.style.display = 'none'; // Rejti a gombokat
                return;
            }
            showScreen(difficultySelectionScreen); // Kérdések betöltése után látható a nehézségválasztó
        } catch (error) {
            console.error("Hiba a kérdések betöltésekor:", error);
            document.getElementById('game-title').textContent = "Hiba történt a kérdések betöltésekor. Kérjük, ellenőrizze a console-t.";
            difficultySelectionScreen.style.display = 'none'; // Rejti a gombokat
        }
    }


    /**
     * Megjelenít egy adott képernyőt, elrejtve a többit.
     * @param {HTMLElement} screenToShow - Az aktívvá teendő képernyő DOM eleme.
     */
    function showScreen(screenToShow) {
        document.querySelectorAll('.screen').forEach(screen => {
            screen.classList.remove('active');
        });
        screenToShow.classList.add('active');
    }

    /**
     * Elindítja a játékot a kiválasztott nehézségi szinttel.
     * @param {string} difficulty - A kiválasztott nehézségi szint ('easy', 'medium', 'hard').
     */
    function startGame(difficulty) {
        selectedDifficulty = difficulty;
        // Másolatot készít és megkeveri a kérdéseket
        currentQuestions = shuffleArray([...allQuestions[difficulty]]); 
        currentQuestionIndex = 0;
        score = 0;
        correctAnswers = 0;
        
        // Segítők alaphelyzetbe állítása
        fiftyFiftyUsed = false;
        phoneUsed = false;
        audienceUsed = false;
        updateHelpButtonStates();

        scoreDisplay.textContent = score;
        totalQuestionsCountDisplay.textContent = currentQuestions.length;
        
        showScreen(quizScreen);
        displayQuestion();
    }

    /**
     * Megjeleníti az aktuális kérdést és válaszlehetőségeket.
     */
    function displayQuestion() {
        isAnswerBlocked = false; // Új kérdésnél engedélyezzük a válaszadást

        // Törli az előző válasz gombokat
        while (answerButtonsElement.firstChild) {
            answerButtonsElement.removeChild(answerButtonsElement.firstChild);
        }

        const question = currentQuestions[currentQuestionIndex];
        questionText.textContent = question.question;
        currentQuestionNumberDisplay.textContent = currentQuestionIndex + 1;

        // Keveri a válaszlehetőségeket, mielőtt megjeleníti őket
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
     * @param {string} selectedOption - A felhasználó által kiválasztott válasz.
     */
    function selectAnswer(selectedOption) {
        if (isAnswerBlocked) return; // Ha már válaszolt vagy segítség aktív
        isAnswerBlocked = true;

        const question = currentQuestions[currentQuestionIndex];
        const isCorrect = selectedOption === question.correctAnswer;

        Array.from(answerButtonsElement.children).forEach(button => {
            button.disabled = true; // Letiltja az összes gombot a válasz után
            if (button.textContent === question.correctAnswer) {
                button.classList.add('correct'); // Helyes válasz zöld
            } else if (button.textContent === selectedOption) {
                button.classList.add('wrong'); // Helytelen válasz piros
            }
        });

        if (isCorrect) {
            score += 10;
            correctAnswers++;
        }
        scoreDisplay.textContent = score;

        setTimeout(() => {
            currentQuestionIndex++;
            if (currentQuestionIndex < currentQuestions.length) {
                displayQuestion();
            } else {
                endGame();
            }
        }, 1500); // 1.5 másodperc várakozás a következő kérdés előtt
    }

    /**
     * Befejezi a játékot és megjeleníti az eredményeket.
     */
    function endGame() {
        finalScoreDisplay.textContent = score;
        correctAnswersCountDisplay.textContent = correctAnswers;
        showScreen(resultScreen);
    }

    /**
     * Visszaállítja a játékot a kezdeti állapotba.
     */
    function resetGame() {
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

    // --- Segítő funkciók ---

    /**
     * 50:50 segítség használata.
     * Két helytelen választ eltávolít a válaszlehetőségek közül.
     */
    function useFiftyFifty() {
        if (fiftyFiftyUsed) return;
        fiftyFiftyUsed = true;
        updateHelpButtonStates();
        isAnswerBlocked = true; // Ideiglenesen blokkolja a válaszadást, amíg a gombok eltűnnek

        const question = currentQuestions[currentQuestionIndex];
        const wrongOptions = question.options.filter(opt => opt !== question.correctAnswer);
        
        // Két véletlenszerű helytelen opció kiválasztása
        const optionsToRemove = [];
        while (optionsToRemove.length < 2 && wrongOptions.length > 0) {
            const randomIndex = Math.floor(Math.random() * wrongOptions.length);
            optionsToRemove.push(wrongOptions.splice(randomIndex, 1)[0]);
        }

        Array.from(answerButtonsElement.children).forEach(button => {
            if (optionsToRemove.includes(button.textContent)) {
                button.style.visibility = 'hidden'; // Eltünteti a gombot
                button.disabled = true; // Le is tiltja
            }
        });

        isAnswerBlocked = false; // Visszaállítja
    }

    /**
     * Telefonos segítség használata.
     * Megjelenít egy tippet a helyes válaszra.
     */
    function usePhoneAFriend() {
        if (phoneUsed) return;
        phoneUsed = true;
        updateHelpButtonStates();
        // isAnswerBlocked = true; // Nem feltétlenül kell blokkolni, csak a pop-up miatt

        const question = currentQuestions[currentQuestionIndex];
        let tip = '';
        const randomNumber = Math.random(); 

        let correctChance = 0.7; // Alap 70%
        if (selectedDifficulty === 'easy') correctChance = 0.9;
        if (selectedDifficulty === 'hard') correctChance = 0.5;

        if (randomNumber < correctChance) {
            tip = `A barátod szerint a helyes válasz valószínűleg: **${question.correctAnswer}**`;
        } else {
            const wrongOptions = question.options.filter(opt => opt !== question.correctAnswer);
            const randomWrong = wrongOptions[Math.floor(Math.random() * wrongOptions.length)];
            tip = `A barátod a **${randomWrong}** választ javasolja, de nem teljesen biztos benne.`;
        }
        
        showModal('Telefonos segítség', tip);
    }

    /**
     * Közönségszavazás segítség használata.
     * Megjelenít egy szimulált szavazási eredményt.
     */
    function useAudiencePoll() {
        if (audienceUsed) return;
        audienceUsed = true;
        updateHelpButtonStates();
        // isAnswerBlocked = true; // Nem feltétlenül kell blokkolni

        const question = currentQuestions[currentQuestionIndex];
        const results = {};
        let totalPercentage = 100;

        let correctPercentage = 70; // Alap 70%
        if (selectedDifficulty === 'easy') correctPercentage = 85;
        if (selectedDifficulty === 'hard') correctPercentage = 55;

        results[question.correctAnswer] = correctPercentage;
        totalPercentage -= correctPercentage;

        const wrongOptions = question.options.filter(opt => opt !== question.correctAnswer);
        let remainingOptions = wrongOptions.length;

        // Elosztja a maradék százalékot a rossz válaszok között
        wrongOptions.forEach((option, index) => {
            if (index < remainingOptions - 1) {
                let allocated = Math.floor(Math.random() * (totalPercentage / remainingOptions * 1.5 - 5)) + 5; 
                allocated = Math.min(allocated, totalPercentage); 
                results[option] = allocated;
                totalPercentage -= allocated;
            } else {
                results[option] = totalPercentage;
            }
        });

        // Biztosítja, hogy az összesített százalék pontosan 100 legyen (kerekítési hibák miatt)
        const sum = Object.values(results).reduce((a, b) => a + b, 0);
        if (sum !== 100) {
            for (const key in results) {
                results[key] = Math.round(results[key] / sum * 100);
            }
        }
        
        displayAudienceChart(question.options, results);
        showModal('Közönségszavazás', '', true); // true jelzi, hogy diagramot kell mutatni
    }

    /**
     * Megjeleníti a modális ablakot.
     * @param {string} title - A modális ablak címe.
     * @param {string} content - A modális ablak tartalma (szöveg).
     * @param {boolean} showChart - Igaz, ha a közönségszavazás diagramot is mutatni kell.
     */
    function showModal(title, content, showChart = false) {
        modalTitle.textContent = title;
        modalContent.innerHTML = content;
        audienceChart.innerHTML = ''; // Törli az előző diagramot
        
        if (showChart) {
            modalContent.style.display = 'none';
            audienceChart.style.display = 'flex';
        } else {
            modalContent.style.display = 'block';
            audienceChart.style.display = 'none';
        }
        
        overlay.classList.add('active');
    }

    /**
     * Bezárja a modális ablakot.
     */
    function closeModal() {
        overlay.classList.remove('active');
    }

    /**
     * Megjeleníti a közönségszavazás diagramot.
     * @param {string[]} options - A kérdés válaszlehetőségei.
     * @param {Object.<string, number>} results - A válaszlehetőségekhez tartozó százalékok.
     */
    function displayAudienceChart(options, results) {
        audienceChart.innerHTML = ''; // Törli az előző oszlopokat
        options.forEach(option => {
            const percentage = results[option] || 0;
            const barContainer = document.createElement('div');
            barContainer.classList.add('audience-bar-container');

            const bar = document.createElement('div');
            bar.classList.add('audience-bar');
            bar.style.height = `${percentage}%`;
            // bar.textContent = `${percentage}%`; // Lehet, hogy túl sok, ha kicsi a sáv

            const percentageSpan = document.createElement('span');
            percentageSpan.textContent = `${percentage}%`;
            bar.appendChild(percentageSpan);

            const label = document.createElement('div');
            label.classList.add('label');
            label.textContent = option;

            barContainer.appendChild(bar);
            barContainer.appendChild(label);
            audienceChart.appendChild(barContainer);
        });
    }


    // --- Segéd függvények ---

    /**
     * Keveri a tömb elemeit (Fisher-Yates shuffle algoritmus).
     * @param {Array} array - A keverendő tömb.
     * @returns {Array} - A megkevert tömb.
     */
    function shuffleArray(array) {
        for (let i = array.length - 1; i > 0; i--) {
            const j = Math.floor(Math.random() * (i + 1));
            [array[i], array[j]] = [array[j], array[i]];
        }
        return array;
    }
});