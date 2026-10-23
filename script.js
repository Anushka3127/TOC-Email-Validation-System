
const emailInput = document.getElementById("email");
const validateBtn = document.getElementById("validateBtn");
const resetBtn = document.getElementById("resetBtn");
const result = document.getElementById("result");
const dryRun = document.getElementById("dryRun");
const stateInfo = document.getElementById("stateInfo");
const svgStatus = document.getElementById("svgStatus");

// Regular expression for email validation
const emailPattern =
    /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]+@[A-Za-z0-9](?:[A-Za-z0-9-]*[A-Za-z0-9])?(?:\.[A-Za-z]{2,})+$/;

// State descriptions
const stateNames = {
    q0: "Start State",
    q1: "Local Part",
    q2: "After @",
    q3: "Domain",
    q4: "After Dot",
    q5: "Accepting State",
    qd: "Dead / Reject State"
};

// Diagram transition IDs
const edgeIds = {
    "q0-q1": "e01",
    "q1-q1": "e11",
    "q1-q2": "e12",
    "q2-q3": "e23",
    "q3-q3": "e33",
    "q3-q4": "e34",
    "q4-q5": "e45",
    "q5-q5": "e55"
};

// Character checking functions
function isLetter(ch) {
    return /^[A-Za-z]$/.test(ch);
}

function isLocalChar(ch) {
    return /^[A-Za-z0-9.!#$%&'*+/=?^_`{|}~-]$/.test(ch);
}

function isDomainChar(ch) {
    return /^[A-Za-z0-9-]$/.test(ch);
}

// Determine the next state
function getNextState(state, ch) {
    switch (state) {
        case "q0":
            return isLocalChar(ch) ? "q1" : "qd";

        case "q1":
            if (ch === "@") return "q2";
            return isLocalChar(ch) ? "q1" : "qd";

        case "q2":
            return /^[A-Za-z0-9]$/.test(ch) ? "q3" : "qd";

        case "q3":
            if (ch === ".") return "q4";
            return isDomainChar(ch) ? "q3" : "qd";

        case "q4":
            return isLetter(ch) ? "q5" : "qd";

        case "q5":
            if (ch === ".") return "q4";
            return isLetter(ch) ? "q5" : "qd";

        case "qd":
        default:
            return "qd";
    }
}

// Clear old diagram highlights
function clearDiagram() {
    document.querySelectorAll("#dfa .state").forEach(state => {
        state.classList.remove("active", "rejected");
    });

    document.querySelectorAll("#dfa .edge").forEach(edge => {
        edge.classList.remove("active", "rejected-edge");
        edge.setAttribute("marker-end", "url(#arrow)");
    });

    document.getElementById("q5inner")
        ?.setAttribute("stroke", "#64748b");
}

// Highlight the current state
function highlightState(state) {
    const element = document.getElementById(state);

    if (element) {
        element.classList.add(
            state === "qd" ? "rejected" : "active"
        );
    }
}

// Safely display input characters
function escapeHTML(value) {
    return value.replace(/[&<>"']/g, ch => ({
        "&": "&amp;",
        "<": "&lt;",
        ">": "&gt;",
        '"': "&quot;",
        "'": "&#39;"
    })[ch]);
}

// Main validation and dry-run function
function validateEmail() {
    const email = emailInput.value.trim();

    clearDiagram();

    if (email === "") {
        result.className = "result";
        result.textContent = "Enter an email address to begin.";

        dryRun.innerHTML =
            '<tr><td colspan="5">Enter an email to see the dry run.</td></tr>';

        stateInfo.textContent = "Current state: q0 (Start State)";
        svgStatus.textContent = "Waiting for input";

        highlightState("q0");
        return;
    }

    let currentState = "q0";
    let rows = "";
    let visitedEdges = [];
    let rejected = false;

    // Read every character
    for (let i = 0; i < email.length; i++) {
        const symbol = email[i];
        const previousState = currentState;
        const nextState = getNextState(previousState, symbol);

        const edgeId = edgeIds[previousState + "-" + nextState];

        if (edgeId) {
            visitedEdges.push(edgeId);
        }

        currentState = nextState;

        const isRejected = currentState === "qd";

        rows += `
            <tr class="${isRejected ? "rejected-step" : ""}">
                <td>${i + 1}</td>
                <td>${escapeHTML(symbol)}</td>
                <td>${previousState}</td>
                <td>${nextState}</td>
                <td>${previousState} → ${nextState}</td>
            </tr>`;

        if (isRejected) {
            rejected = true;
            break;
        }
    }

    // Verify complete email format
    const regexValid = emailPattern.test(email);
    const isValid =
        regexValid && !rejected && currentState === "q5";

    // Add an explicit rejection row if the simplified
    // state machine does not fully represent the format.
    if (!isValid && !rejected) {
        rows += `
            <tr class="rejected-step">
                <td>${email.length + 1}</td>
                <td>EOF</td>
                <td>${currentState}</td>
                <td>qd</td>
                <td>Format check failed → Reject</td>
            </tr>`;

        currentState = "qd";
    }

    // Display dry run
    dryRun.innerHTML = rows;

    // Highlight transitions
    visitedEdges.forEach(id => {
        const edge = document.getElementById(id);

        if (edge) {
            edge.classList.add("active");
            edge.setAttribute("marker-end", "url(#activeArrow)");
        }
    });

    // Highlight final state
    highlightState(currentState);

    if (currentState === "qd") {
        const rejectEdge = document.getElementById("rejectEdge");

        if (rejectEdge) {
            rejectEdge.classList.add("rejected-edge");
            rejectEdge.setAttribute("marker-end", "url(#rejectArrow)");
        }
    }

    if (isValid) {
        document.getElementById("q5inner")
            ?.setAttribute("stroke", "#16a34a");

        result.className = "result valid";
        result.textContent = "✓ VALID EMAIL — Email accepted.";
        svgStatus.textContent = "Accepted: final state q5";
    } else {
        result.className = "result invalid";
        result.textContent = "✗ INVALID EMAIL — Email rejected.";

        svgStatus.textContent = rejected
            ? "Rejected: dead state qd"
            : "Rejected: email format failed";
    }

    stateInfo.textContent =
        "Current state: " + currentState +
        " (" + stateNames[currentState] + ")" +
        " | Regex: " + (regexValid ? "Matched" : "Not matched");
}

// Validate while typing
emailInput.addEventListener("input", validateEmail);

// Validate button
validateBtn.addEventListener("click", validateEmail);

// Reset all values and states
resetBtn.addEventListener("click", function () {
    emailInput.value = "";

    clearDiagram();

    result.className = "result";
    result.textContent = "Enter an email address to begin.";

    dryRun.innerHTML =
        '<tr><td colspan="5">Enter an email to see the dry run.</td></tr>';

    stateInfo.textContent = "Current state: q0 (Start State)";
    svgStatus.textContent = "Waiting for input";

    highlightState("q0");
});

// Test example buttons
document.querySelectorAll(".example").forEach(button => {
    button.addEventListener("click", function () {
        emailInput.value = this.dataset.email;
        validateEmail();
    });
});

// Initialize the application
clearDiagram();
highlightState("q0");
