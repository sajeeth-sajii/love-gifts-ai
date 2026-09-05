// ===== GLOBAL CART COUNTER =====
// Keeps track of total items added to cart
let cartCount=0;

// ===== GLOBAL CART ITEMS ARRAY =====
// Keeps track of all items added to cart with quantities
let cartItems = [];

// ===== GLOBAL WISHLIST ARRAY =====
// Keeps track of all items added to wishlist
let wishlistItems = [];

const firebaseConfig = {
    apiKey: "AIzaSyAaTqXtNh5a6s_3P41TjU80AbsaOZ-cIvo",
    authDomain: "love-gifts-ai.firebaseapp.com",
    projectId: "love-gifts-ai",
    storageBucket: "love-gifts-ai.firebasestorage.app",
    messagingSenderId: "568641056714",
    appId: "1:568641056714:web:844f0ee6e1d0050a86933",
    measurementId: "G-F3ZVB9SLYD"
};

let auth = null;
let db = null;
let firebaseApp = null;

if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
    self.FIREBASE_APPCHECK_DEBUG_TOKEN = true;
}

const firebaseServicesReady = Promise.all([
    import("https://www.gstatic.com/firebasejs/12.0.0/firebase-app.js"),
    import("https://www.gstatic.com/firebasejs/12.0.0/firebase-auth.js"),
    import("https://www.gstatic.com/firebasejs/12.0.0/firebase-firestore.js"),
    import("https://www.gstatic.com/firebasejs/12.0.0/firebase-app-check.js")
]).then(([appSdk, authSdk, firestoreSdk, appCheckSdk]) => {
    firebaseApp = appSdk.initializeApp(firebaseConfig);
    const appCheckSiteKey = window.LOVE_GIFTS_RECAPTCHA_SITE_KEY || "";
    if (appCheckSiteKey) {
        appCheckSdk.initializeAppCheck(firebaseApp, {
            provider: new appCheckSdk.ReCaptchaV3Provider(appCheckSiteKey),
            isTokenAutoRefreshEnabled: true
        });
    } else if (window.location.hostname === "localhost" || window.location.hostname === "127.0.0.1") {
        console.warn("Firebase App Check is not initialized. Set LOVE_GIFTS_RECAPTCHA_SITE_KEY for localhost AI Logic testing.");
    }
    const authInstance = authSdk.getAuth(firebaseApp);
    const firestoreInstance = firestoreSdk.getFirestore(firebaseApp);
    auth = {
        get currentUser(){ return authInstance.currentUser; },
        signInWithEmailAndPassword: (email, password) => authSdk.signInWithEmailAndPassword(authInstance, email, password),
        createUserWithEmailAndPassword: (email, password) => authSdk.createUserWithEmailAndPassword(authInstance, email, password),
        onAuthStateChanged: callback => authSdk.onAuthStateChanged(authInstance, callback),
        signOut: () => authSdk.signOut(authInstance)
    };
    db = {
        collection: name => ({
            doc: id => ({
                set: data => firestoreSdk.setDoc(firestoreSdk.doc(firestoreInstance, name, id), data),
                collection: childName => ({
                    add: data => firestoreSdk.addDoc(firestoreSdk.collection(firestoreInstance, name, id, childName), data)
                })
            })
        })
    };
    window.firebase = {
        auth: () => auth,
        firestore: Object.assign(() => db, { FieldValue: { serverTimestamp: firestoreSdk.serverTimestamp } })
    };
    window.loveGiftsFirebaseApp = firebaseApp;
    auth.onAuthStateChanged(updateAuthUI);
    updateAuthUI();
    return firebaseApp;
}).catch(error => {
    console.error("Firebase initialization failed.", { code: error?.code || "unknown", message: error?.message || String(error) });
    return null;
});
window.loveGiftsFirebaseReady = firebaseServicesReady;

function saveAuthUser(user){
    // Authentication must be derived from Firebase auth state; localStorage is not used for auth.
    return null;
}

function getAuthUser(){
    if (!auth || !auth.currentUser) {
        return null;
    }

    return {
        name: auth.currentUser.displayName || auth.currentUser.email?.split("@")[0] || "User",
        email: auth.currentUser.email,
        provider: "Firebase"
    };
}

function clearAuthUser(){
    // Keep cart/wishlist localStorage intact; auth state is provided only by Firebase.
    return null;
}

function ensureAuthUI(){
    const header = document.querySelector("header");
    if(!header) return;

    if(!document.getElementById("loginHeaderBtn")){
        const authControls = document.createElement("div");
        authControls.className = "auth-controls";
        authControls.innerHTML = `
            <button class="topHr login-header-btn" id="loginHeaderBtn" type="button">Login</button>
            <div class="user-chip" id="userChip" style="display:none;">
                <span id="userNameLabel"></span>
                <button type="button" id="logoutBtn">Logout</button>
            </div>
        `;
        header.appendChild(authControls);
    }

    if(!document.getElementById("loginModal")){
        const modal = document.createElement("div");
        modal.className = "login-modal";
        modal.id = "loginModal";
        modal.setAttribute("aria-hidden", "true");
        modal.innerHTML = `
            <div class="login-card">
                <button class="close-login" id="closeLoginBtn" type="button" aria-label="Close login">×</button>
                <h3>Welcome back</h3>
                <p>Sign in with your email and password.</p>
                <form id="loginForm" class="login-form">
                    <input id="loginUsername" type="email" placeholder="Email" required>
                    <input id="loginPassword" type="password" placeholder="Password" required>
                    <button type="submit" class="login-submit">Login</button>
                </form>
                <form id="signupForm" class="login-form" style="display:none;">
                    <input id="signupName" type="text" placeholder="Name" required>
                    <input id="signupEmail" type="email" placeholder="Email" required>
                    <input id="signupPassword" type="password" placeholder="Password" required>
                    <button type="submit" class="login-submit">Create Account</button>
                </form>
                <button type="button" id="authModeToggle" style="margin-top:10px; background:transparent; border:none; color:#8b1e3f; cursor:pointer; font-weight:600;">Create Account / Sign Up</button>
                <div class="social-login">
                    <button type="button" class="social-btn google-btn" data-provider="Google">Continue with Google</button>
                    <button type="button" class="social-btn facebook-btn" data-provider="Facebook">Continue with Facebook</button>
                </div>
                <p class="login-status" id="loginStatus">Use your email and password to continue.</p>
                <button type="button" id="resendVerificationBtn" style="display:none; margin-top:10px; background:#fff; border:1px solid #8b1e3f; color:#8b1e3f; padding:8px 12px; border-radius:8px; cursor:pointer;">Resend verification email</button>
            </div>
        `;
        document.body.appendChild(modal);
    }
}

function updateAuthUI(){
    const user = getAuthUser();
    const loginBtn = document.getElementById("loginHeaderBtn");
    const userChip = document.getElementById("userChip");
    const userNameLabel = document.getElementById("userNameLabel");
    const logoutBtn = document.getElementById("logoutBtn");

    if(!loginBtn || !userChip || !userNameLabel || !logoutBtn) return;

    if(user){
        loginBtn.style.display = "none";
        userChip.style.display = "flex";
        userNameLabel.innerText = `Hi, ${user.name}`;
    } else {
        loginBtn.style.display = "inline-block";
        userChip.style.display = "none";
    }
}

function resetLoginModalState(){
    const usernameInput = document.getElementById("loginUsername");
    const passwordInput = document.getElementById("loginPassword");
    const signupNameInput = document.getElementById("signupName");
    const signupEmailInput = document.getElementById("signupEmail");
    const signupPasswordInput = document.getElementById("signupPassword");
    const status = document.getElementById("loginStatus");
    const loginForm = document.getElementById("loginForm");
    const signupForm = document.getElementById("signupForm");
    const modeToggle = document.getElementById("authModeToggle");
    const resendButton = document.getElementById("resendVerificationBtn");

    if(usernameInput) usernameInput.value = "";
    if(passwordInput) passwordInput.value = "";
    if(signupNameInput) signupNameInput.value = "";
    if(signupEmailInput) signupEmailInput.value = "";
    if(signupPasswordInput) signupPasswordInput.value = "";
    if(loginForm) loginForm.style.display = "block";
    if(signupForm) signupForm.style.display = "none";
    if(modeToggle) modeToggle.innerText = "Create Account / Sign Up";
    if(resendButton) resendButton.style.display = "none";
    if(status) status.innerText = "Use your email and password to continue.";
}

function openLoginModal(){
    resetLoginModalState();
    const modal = document.getElementById("loginModal");
    if(modal){
        modal.classList.add("open");
        modal.setAttribute("aria-hidden", "false");
    }
}

function closeLoginModal(){
    const modal = document.getElementById("loginModal");
    if(modal){
        modal.classList.remove("open");
        modal.setAttribute("aria-hidden", "true");
    }
}

function handleUserLogin(email, password = ""){
    const trimmedEmail = email ? email.trim() : "";
    const status = document.getElementById("loginStatus");
    const resendButton = document.getElementById("resendVerificationBtn");

    if(!trimmedEmail){
        if(status){ status.innerText = "Please enter your email address."; }
        return;
    }

    if(!trimmedEmail.includes("@") || !trimmedEmail.includes(".")){
        if(status){ status.innerText = "Please enter a valid email address."; }
        return;
    }

    if(!password){
        if(status){ status.innerText = "Please enter your password."; }
        return;
    }

    if(!auth){
        if(status){ status.innerText = "Authentication is unavailable right now."; }
        return;
    }

    auth.signInWithEmailAndPassword(trimmedEmail, password)
        .then(async () => {
            if(resendButton){ resendButton.style.display = "none"; }
            updateAuthUI();
            closeLoginModal();
            if(status){ status.innerText = "Login successful."; }
        })
        .catch((error) => {
            console.error("Firebase login failed.", {
                code: error.code || "unknown",
                message: error.message
            });

            if(status){
                status.innerText = error.code === "auth/invalid-credential"
                    ? "Incorrect email or password. Please check your credentials or reset your password."
                    : error.code === "auth/too-many-requests"
                        ? "Too many login attempts. Please wait a while and try again."
                        : error.message;
            }
        });
}

async function handleUserSignup(name, email, password){
    const trimmedName = name ? name.trim() : "";
    const trimmedEmail = email ? email.trim() : "";
    const status = document.getElementById("loginStatus");
    const resendButton = document.getElementById("resendVerificationBtn");
    const loginForm = document.getElementById("loginForm");
    const signupForm = document.getElementById("signupForm");

    if(!trimmedName){
        if(status){ status.innerText = "Please enter your name."; }
        return;
    }

    if(!trimmedEmail){
        if(status){ status.innerText = "Please enter your email address."; }
        return;
    }

    if(!trimmedEmail.includes("@") || !trimmedEmail.includes(".")){
        if(status){ status.innerText = "Please enter a valid email address."; }
        return;
    }

    if(!password || password.length < 6){
        if(status){ status.innerText = "Password should be at least 6 characters long."; }
        return;
    }

    if(!auth){
        if(status){ status.innerText = "Authentication is unavailable right now."; }
        return;
    }

    try {
        const userCredential = await auth.createUserWithEmailAndPassword(trimmedEmail, password);
        const user = userCredential.user;

        if (trimmedName) {
            await user.updateProfile({ displayName: trimmedName });
        }

        if (db) {
            try {
                await db.collection("users").doc(user.uid).set({
                    uid: user.uid,
                    name: trimmedName,
                    email: user.email,
                    createdAt: firebase.firestore.FieldValue.serverTimestamp()
                });
            } catch (error) {
                console.error("Firestore user profile creation failed.", {
                    code: error.code || "unknown",
                    message: error.message,
                    uid: user.uid
                });
            }
        }

        updateAuthUI();
        closeLoginModal();

        if(status){ status.innerText = "Account created successfully. You can now continue."; }
        if(resendButton){ resendButton.style.display = "none"; }

        if(loginForm) loginForm.style.display = "block";
        if(signupForm) signupForm.style.display = "none";
        const toggle = document.getElementById("authModeToggle");
        if(toggle) toggle.innerText = "Create Account / Sign Up";

        if (loginForm) loginForm.reset();
        if (signupForm) signupForm.reset();
    } catch (error) {
        console.error("Firebase account creation failed.", {
            code: error.code || "unknown",
            message: error.message
        });
        if(status){
            status.innerText = error.code === "auth/too-many-requests"
                ? "Too many login attempts. Please wait a while and try again."
                : error.message;
        }
    }
}

async function handleResendVerificationEmail(){
    const status = document.getElementById("loginStatus");
    const resendButton = document.getElementById("resendVerificationBtn");

    if(resendButton){ resendButton.style.display = "none"; }
    if(status){ status.innerText = "Email verification is disabled for this sign-in flow."; }
}

// ===== STORAGE HELPERS =====
function saveCartState(){
    localStorage.setItem("cartItems", JSON.stringify(cartItems));
    localStorage.setItem("cartCount", String(cartCount));
    localStorage.setItem("wishlistItems", JSON.stringify(wishlistItems));
}

function loadCartState(){
    let storedItems = localStorage.getItem("cartItems");
    if(storedItems){
        try{
            cartItems = JSON.parse(storedItems);
        } catch(e){
            cartItems = [];
        }
    }

    let storedCount = parseInt(localStorage.getItem("cartCount"), 10);
    if(!isNaN(storedCount)){
        cartCount = storedCount;
    } else {
        cartCount = cartItems.reduce((sum, item) => sum + (item.quantity || 0), 0);
    }

    let storedWishlist = localStorage.getItem("wishlistItems");
    if(storedWishlist){
        try{
            wishlistItems = JSON.parse(storedWishlist);
        } catch(e){
            wishlistItems = [];
        }
    }

    let cartBadge = document.getElementById("cartCount");
    if(cartBadge){
        cartBadge.innerText = cartCount;
    }

    updateWishlistDisplay();
    updateCartDisplay();

    cartItems.forEach(item => {
        // Search across all product containers (.cart, .secondone, .thirdone)
        let productCard = Array.from(document.querySelectorAll(".cart, .secondone, .thirdone")).find(card => {
            let title = card.querySelector("h3");
            return title && title.innerText.trim() === item.name.trim();
        });
        if(productCard){
            let addBtn = productCard.querySelector(".cartHra");
            let counter = productCard.querySelector(".counter");
            let countSpan = productCard.querySelector(".count");
            if(addBtn) addBtn.style.display = "none";
            if(counter){
                counter.style.display = "flex";
                if(countSpan) countSpan.innerText = item.quantity;
            }
        }
    });
}

function viewCartPage(){
    window.location.href = "cart_checkout.html";
}

// ===== SHOW COUNTER FUNCTION =====
// This function is called when "Add Cart" button is clicked
// It shows the quantity counter (-, 1, +) and hides the "Add Cart" button
function requireLogin(){
    if(getAuthUser()) return true;
    openLoginModal();
    return false;
}

function showCounter(cartHra){
    if(!requireLogin()) return;

    // Get the product card container (works for .cart, .secondone, .thirdone)
    let productCard = cartHra.closest(".cart, .secondone, .thirdone") || cartHra.closest("[class*='one']") || cartHra.closest("div[class]");
    
    // Get product details from the card
    let productName = productCard.querySelector("h3").innerText;
    let productPrice = productCard.querySelector("p").innerText;
    let productImage = productCard.querySelector("img").src;
    
    // Check if item already exists in cart
    let existingItem = cartItems.find(item => item.name === productName);
    
    if(!existingItem){
        // Create cart item object with initial quantity of 1
        let cartItem = {
            name: productName,
            price: productPrice,
            image: productImage,
            quantity: 1,
            id: Date.now() // Unique ID using timestamp
        };
        
        // Add item to cart array
        cartItems.push(cartItem);
    } else {
        existingItem.quantity++;
    }
    
    // Increment cart count by 1
    cartCount++;

    // Update the cart badge with new count
    document.getElementById("cartCount").innerText = cartCount;

    // Hide the "Add Cart" button
    cartHra.style.display = "none";

    // Get the counter div (-, count, +) from parent element
    let counter =
    cartHra.parentElement.querySelector(".counter");
    let countSpan = counter ? counter.querySelector(".count") : null;

    // Show the counter
    if(counter){
        counter.style.display = "flex";
    }

    // Keep the on-screen counter in sync with cart quantity
    if(countSpan){
        countSpan.innerText = existingItem ? existingItem.quantity : 1;
    }
    
    // Update cart display
    updateCartDisplay();
    saveCartState();
}

// ===== BUY NOW BUTTON HANDLER =====
function handleBuyNow(button){
    if(!requireLogin()) return;

    // Get the product card container (works for all product types)
    let productCard = button.closest(".cart, .secondone, .thirdone") || button.closest("div[class]");

    let productName = productCard.querySelector("h3").innerText;
    let productPrice = productCard.querySelector("p").innerText;

    let encodedName = encodeURIComponent(productName);
    let encodedPrice = encodeURIComponent(productPrice);
    window.location.href = `checkout.html?name=${encodedName}&price=${encodedPrice}`;
}

// ===== WISHLIST HEART RENDERING HELPERS =====
function renderHeartIcon(active){
    return `
        <svg class="heart-icon" viewBox="0 0 24 24" aria-hidden="true">
            <path d="M12 21s-6.5-4.35-9-8.5C1.2 8.7 2.6 5 6.5 5 9 5 11 6.5 12 8.2 13 6.5 15 5 17.5 5c3.9 0 5.3 3.7 3.5 7.5C18.5 16.65 12 21 12 21z"/>
        </svg>`;
}

function updateWishlistButtonState(button, active){
    if(!button) return;
    button.classList.toggle("active", active);
    button.setAttribute("aria-pressed", active ? "true" : "false");
    button.innerHTML = renderHeartIcon(active);
}

function initializeWishlistButtons(){
    document.querySelectorAll(".wishlist-btn").forEach(button => {
        const productCard = button.closest(".cart, .secondone, .thirdone") || button.closest("div[class]");
        const productName = productCard ? productCard.querySelector("h3")?.innerText.trim() : "";
        const active = wishlistItems.some(item => item.name === productName);
        updateWishlistButtonState(button, active);
    });
}

// ===== INSERT BUY NOW BUTTONS NEXT TO ADD CART =====
document.addEventListener("DOMContentLoaded", function(){
    loadCartState();
    initializeWishlistButtons();
    ensureAuthUI();
    updateAuthUI();

    const loginHeaderBtn = document.getElementById("loginHeaderBtn");
    const closeLoginBtn = document.getElementById("closeLoginBtn");
    const loginForm = document.getElementById("loginForm");
    const signupForm = document.getElementById("signupForm");
    const loginUsername = document.getElementById("loginUsername");
    const loginPassword = document.getElementById("loginPassword");
    const signupName = document.getElementById("signupName");
    const signupEmail = document.getElementById("signupEmail");
    const signupPassword = document.getElementById("signupPassword");
    const authModeToggle = document.getElementById("authModeToggle");
    const resendVerificationBtn = document.getElementById("resendVerificationBtn");
    const socialButtons = document.querySelectorAll(".social-btn");
    const logoutBtn = document.getElementById("logoutBtn");
    const modal = document.getElementById("loginModal");

    if(loginHeaderBtn){
        loginHeaderBtn.addEventListener("click", () => {
            if(getAuthUser()){
                updateAuthUI();
                return;
            }
            openLoginModal();
        });
    }

    if(closeLoginBtn){
        closeLoginBtn.addEventListener("click", closeLoginModal);
    }

    if(modal){
        modal.addEventListener("click", (event) => {
            if(event.target === modal){
                closeLoginModal();
            }
        });
    }

    if(loginForm){
        loginForm.addEventListener("submit", (event) => {
            event.preventDefault();
            const email = loginUsername ? loginUsername.value : "";
            const password = loginPassword ? loginPassword.value : "";
            const status = document.getElementById("loginStatus");
            if(!email.trim() || !password.trim()){
                if(status){ status.innerText = "Please enter both email and password."; }
                return;
            }
            handleUserLogin(email, password);
        });
    }

    if(signupForm){
        signupForm.addEventListener("submit", (event) => {
            event.preventDefault();
            const name = signupName ? signupName.value : "";
            const email = signupEmail ? signupEmail.value : "";
            const password = signupPassword ? signupPassword.value : "";
            handleUserSignup(name, email, password);
        });
    }

    if(authModeToggle){
        authModeToggle.addEventListener("click", () => {
            const signupVisible = signupForm && signupForm.style.display !== "none";
            if(signupForm){ signupForm.style.display = signupVisible ? "none" : "block"; }
            if(loginForm){ loginForm.style.display = signupVisible ? "block" : "none"; }
            authModeToggle.innerText = signupVisible ? "Create Account / Sign Up" : "Login";
        });
    }

    if(resendVerificationBtn){
        resendVerificationBtn.addEventListener("click", handleResendVerificationEmail);
    }

    socialButtons.forEach(button => {
        button.addEventListener("click", () => {
            const status = document.getElementById("loginStatus");
            if(status){ status.innerText = "Google/Facebook login is not enabled on this website."; }
        });
    });

    if(logoutBtn){
        logoutBtn.addEventListener("click", async () => {
            resetLoginModalState();
            if (auth) {
                await auth.signOut().catch(() => {});
            }
            clearAuthUser();
            updateAuthUI();
            openLoginModal();
        });
    }

    document.querySelectorAll(".cart-section").forEach(section => {
        if(!section.querySelector(".buy-now")){
            let buyNow = document.createElement("button");
            buyNow.type = "button";
            buyNow.className = "buy-now";
            buyNow.innerText = "Buy Now";
            buyNow.addEventListener("click", function(){
                handleBuyNow(this);
            });
            let wishlistBtn = section.querySelector(".wishlist-btn");
            if(wishlistBtn){
                section.insertBefore(buyNow, wishlistBtn);
            } else {
                section.appendChild(buyNow);
            }
        }
    });
    setupSearchSuggestions();
});

function setupSearchSuggestions(){
    const searchInput = document.getElementById("productSearch");
    const suggestionsBox = document.getElementById("searchSuggestions");
    if(!searchInput || !suggestionsBox) return;

    const products = Array.from(document.querySelectorAll(".cart, .secondone, .thirdone")).map(card => {
        const nameEl = card.querySelector("h3");
        const priceEl = card.querySelector("p");
        const imgEl = card.querySelector("img");
        return {
            name: nameEl ? nameEl.innerText.trim() : "",
            price: priceEl ? priceEl.innerText.trim() : "",
            image: imgEl ? imgEl.src : "",
        };
    }).filter(item => item.name.length > 0);

    const renderSuggestions = matches => {
        if(matches.length === 0){
            suggestionsBox.innerHTML = '<div class="search-no-results">No matching products found</div>';
            suggestionsBox.style.display = "block";
            return;
        }

        suggestionsBox.innerHTML = matches.slice(0, 6).map(item => `
            <div class="search-suggestion-item" data-name="${item.name}">
                <img src="${item.image}" alt="${item.name}">
                <div class="suggestion-text">
                    <strong>${item.name}</strong>
                    <span>${item.price}</span>
                </div>
            </div>
        `).join("");
        suggestionsBox.style.display = "block";
    };

    searchInput.addEventListener("input", () => {
        const query = searchInput.value.trim().toLowerCase();
        if(query.length === 0){
            suggestionsBox.style.display = "none";
            suggestionsBox.innerHTML = "";
            return;
        }
        const matches = products.filter(item => item.name.toLowerCase().includes(query));
        renderSuggestions(matches);
    });

    searchInput.addEventListener("focus", () => {
        if(suggestionsBox.innerHTML.trim().length){
            suggestionsBox.style.display = "block";
        }
    });

    document.addEventListener("click", event => {
        if(!searchInput.contains(event.target) && !suggestionsBox.contains(event.target)){
            suggestionsBox.style.display = "none";
        }
    });

    suggestionsBox.addEventListener("click", event => {
        const item = event.target.closest(".search-suggestion-item");
        if(item){
            const value = item.dataset.name;
            searchInput.value = value;
            suggestionsBox.style.display = "none";

            const matchCard = Array.from(document.querySelectorAll(".cart, .secondone, .thirdone")).find(card => {
                const title = card.querySelector("h3");
                return title && title.innerText.trim() === value.trim();
            });
            if(matchCard){
                matchCard.scrollIntoView({ behavior: "smooth", block: "center" });
                matchCard.classList.add("search-match-highlight");
                setTimeout(() => {
                    matchCard.classList.remove("search-match-highlight");
                }, 1600);
            }
        }
    });
}

// ===== INCREASE QUANTITY FUNCTION =====
// Called when user clicks the + button to increase quantity
function increase(cartHra){
    // Get the span showing current quantity
    let count =
    cartHra.parentElement.querySelector(".count");

    // Increase the quantity by 1
    count.innerText =
    parseInt(count.innerText) + 1;

    // Get the product card container (works for all product types)
    let productCard = cartHra.closest(".cart, .secondone, .thirdone") || cartHra.closest("div[class]");
    let productName = productCard.querySelector("h3").innerText;
    
    // Update quantity in cart items array
    let cartItem = cartItems.find(item => item.name === productName);
    if(cartItem){
        cartItem.quantity++;
    }

    // Increment total cart count
    cartCount++;

    // Update the cart badge
    document.getElementById("cartCount").innerText = cartCount;
    saveCartState();
    
    // Update cart display
    updateCartDisplay();
}

// ===== DECREASE QUANTITY FUNCTION =====
// Called when user clicks the - button to decrease quantity
function decrease(cartHra){
    // Get the span showing current quantity
    let count =
    cartHra.parentElement.querySelector(".count");

    // Get current quantity value
    let value = parseInt(count.innerText);

    // Get the product card container (works for all product types)
    let productCard = cartHra.closest(".cart, .secondone, .thirdone") || cartHra.closest("div[class]");
    let productName = productCard.querySelector("h3").innerText;

    // Check if quantity is greater than 1
    if(value > 1){
        // Decrease quantity by 1
        count.innerText = value - 1;
        
        // Update quantity in cart items array
        let cartItem = cartItems.find(item => item.name === productName);
        if(cartItem){
            cartItem.quantity--;
        }
        
        // Decrement total cart count
        cartCount--;

        // Update the cart badge
        document.getElementById("cartCount").innerText = cartCount;
    }
    else{
        // If quantity is 1, remove the item from cart
        cartCount--;

        // Update the cart badge
        document.getElementById("cartCount").innerText = cartCount;
        
        // Remove item from cart items array
        cartItems = cartItems.filter(item => item.name !== productName);
        
        // Hide the counter completely
        cartHra.parentElement.style.display = "none";

        // Show the "Add Cart" button again
        cartHra.parentElement.parentElement
        .querySelector(".cartHra")
        .style.display = "inline-block";
    }
    
    saveCartState();
    // Update cart display
    updateCartDisplay();
}

// ===== ADD TO WISHLIST FUNCTION =====
// Called when user clicks the heart icon to add item to wishlist
function addToWishlist(heartBtn){
    if(!requireLogin()) return;

    // Get the product card container
    let productCard = heartBtn.closest(".cart, .secondone, .thirdone") || heartBtn.closest("div[class]");
    
    // Get product details from the card
    let productName = productCard.querySelector("h3").innerText;
    let rawPrice = productCard.querySelector("p").innerText;
    let productPrice = rawPrice.replace(/[^0-9]/g, "");
    let productImage = productCard.querySelector("img").src;
    
    // Create wishlist item object
    let wishlistItem = {
        name: productName,
        price: productPrice,
        image: productImage,
        id: Date.now() // Unique ID using timestamp
    };
    
    // Check if item already exists in wishlist
    let itemExists = wishlistItems.some(item => item.name === productName);
    
    if(!itemExists){
        // Add item to wishlist array if not already present
        wishlistItems.push(wishlistItem);
        
        // Change heart to filled and add active class
        updateWishlistButtonState(heartBtn, true);
        
        // Trigger animation by removing and re-adding the class
        heartBtn.style.animation = 'none';
        setTimeout(() => {
            heartBtn.style.animation = 'heartBurst 0.6s ease-out';
        }, 10);
        
        // Create particle burst effect
        createHeartParticles(heartBtn);
    } else {
        // Remove item from wishlist if it already exists
        wishlistItems = wishlistItems.filter(item => item.name !== productName);
        
        // Change back to outline heart and remove active class
        updateWishlistButtonState(heartBtn, false);
        heartBtn.style.animation = 'none';
    }

    // Function to create particle burst effect
    function createHeartParticles(element){
        const rect = element.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        
        // Create 8 particles around the heart
        for(let i = 0; i < 8; i++){
            const particle = document.createElement('div');
            particle.style.position = 'fixed';
            particle.style.left = centerX + 'px';
            particle.style.top = centerY + 'px';
            particle.style.width = '8px';
            particle.style.height = '8px';
            particle.style.background = '#ff1744';
            particle.style.borderRadius = '50%';
            particle.style.pointerEvents = 'none';
            particle.style.zIndex = '9999';
            
            const angle = (i / 8) * Math.PI * 2;
            const distance = 50;
            const tx = Math.cos(angle) * distance;
            const ty = Math.sin(angle) * distance;
            
            particle.style.setProperty('--tx', tx + 'px');
            particle.style.setProperty('--ty', ty + 'px');
            particle.style.animation = 'particlePop 0.6s ease-out forwards';
            
            document.body.appendChild(particle);
            
            // Remove particle after animation
            setTimeout(() => particle.remove(), 600);
        }
    }
    // Update wishlist display
    updateWishlistDisplay();
    saveCartState();
}

// ===== UPDATE WISHLIST COUNT =====
function updateWishlistCount(){
    let wishlistBadge = document.getElementById("wishlistCount");
    if(wishlistBadge){
        wishlistBadge.innerText = wishlistItems.length;
    }
}

// ===== UPDATE WISHLIST DISPLAY FUNCTION =====
// Updates the wishlist display section with current wishlist items
function updateWishlistDisplay(){
    // Update the wishlist count badge
    updateWishlistCount();

    // Get the wishlist container
    let wishlistContainer = document.getElementById("wishlistItems");
    
    // If wishlist container doesn't exist, create it
    if(!wishlistContainer){
        return;
    }
    
    // Clear previous items
    wishlistContainer.innerHTML = "";
    
    // Check if wishlist is empty
    if(wishlistItems.length === 0){
        wishlistContainer.innerHTML = "<p style='text-align: center; color: #999;'>Your wishlist is empty</p>";
        return;
    }
    
    // Loop through each wishlist item and create HTML
    wishlistItems.forEach((item, index) => {
        let itemHTML = `
            <div class="wishlist-item">
                <img src="${item.image}" alt="${item.name}">
                <div class="wishlist-item-details">
                    <h4>${item.name}</h4>
                    <p><i class="fa-solid fa-indian-rupee"></i>${item.price}</p>
                </div>
                <div class="wishlist-item-buttons">
                    <button class="add-to-cart-wishlist-btn" onclick="addToCartFromWishlist(${index})" title="Add to Cart">Add to Cart</button>
                    <button class="remove-wishlist-btn" onclick="removeFromWishlist(${index})">Remove</button>
                </div>
            </div>
        `;
        wishlistContainer.innerHTML += itemHTML;
    });
}

// ===== ADD TO CART FROM WISHLIST FUNCTION =====
// Adds item to cart directly from wishlist panel
function addToCartFromWishlist(index){
    // Get the wishlist item
    let wishlistItem = wishlistItems[index];
    
    // Check if item already exists in cart
    let existingItem = cartItems.find(item => item.name === wishlistItem.name);
    
    if(!existingItem){
        // Create cart item object with initial quantity of 1
        let cartItem = {
            name: wishlistItem.name,
            price: wishlistItem.price,
            image: wishlistItem.image,
            quantity: 1,
            id: wishlistItem.id
        };
        
        // Add item to cart array
        cartItems.push(cartItem);
    } else {
        // If item already exists, increment quantity
        existingItem.quantity++;
    }
    
    // Increment cart count by 1
    cartCount++;
    
    // Update the cart badge with new count
    document.getElementById("cartCount").innerText = cartCount;
    
    // Update cart display
    updateCartDisplay();
    saveCartState();
    
    // Show confirmation message
    alert(wishlistItem.name + " added to Cart! 🛒");
}

// ===== REMOVE FROM WISHLIST FUNCTION =====
// Removes item from wishlist by index
function removeFromWishlist(index){
    // Remove item from array
    let itemName = wishlistItems[index].name;
    wishlistItems.splice(index, 1);
    
    // Update all heart icons on the page
    let allHearts = document.querySelectorAll(".wishlist-btn");
    allHearts.forEach(heart => {
        let productCard = heart.closest(".cart, .secondone, .thirdone") || heart.closest("div[class]");
        let cardItemName = productCard.querySelector("h3").innerText;
        if(cardItemName === itemName){
            updateWishlistButtonState(heart, false);
        }
    });
    
    // Update wishlist display
    updateWishlistDisplay();
    saveCartState();
    
    alert(itemName + " removed from Wishlist!");
}

// ===== SHOW WISHLIST FUNCTION =====
// Toggle wishlist panel visibility
function toggleWishlist(){
    let wishlistPanel = document.getElementById("wishlistPanel");
    if(wishlistPanel){
        if(wishlistPanel.style.display === "none" || wishlistPanel.style.display === ""){
            wishlistPanel.style.display = "block";
        } else {
            wishlistPanel.style.display = "none";
        }
    }
}

// ===== CLOSE WISHLIST ON OUTSIDE CLICK =====
// Closes the wishlist panel when clicking anywhere outside of it
document.addEventListener("click", function(event){
    let wishlistPanel = document.getElementById("wishlistPanel");
    let wishlistBtn = document.querySelector(".wishlist-header-btn");
    
    // Check if click is outside the wishlist panel and wishlist button
    if(wishlistPanel && wishlistBtn){
        if(!wishlistPanel.contains(event.target) && !wishlistBtn.contains(event.target)){
            // Close the wishlist panel
            wishlistPanel.style.display = "none";
        }
    }
});

// ===== UPDATE CART DISPLAY FUNCTION =====
// Updates the cart display section with current cart items
function updateCartDisplay(){
    // Get the cart container
    let cartContainer = document.getElementById("cartItems");
    
    // If cart container doesn't exist, create it
    if(!cartContainer){
        return;
    }
    
    // Clear previous items
    cartContainer.innerHTML = "";
    
    // Check if cart is empty
    if(cartItems.length === 0){
        cartContainer.innerHTML = "<p style='text-align: center; color: #999;'>Your cart is empty</p>";
        return;
    }
    
    // Loop through each cart item and create HTML
    cartItems.forEach((item, index) => {
        let itemHTML = `
            <div class="cart-item">
                <img src="${item.image}" alt="${item.name}">
                <div class="cart-item-details">
                    <h4>${item.name}</h4>
                    <p>${item.price}</p>
                    <div class="cart-item-quantity">
                        <button class="qty-btn" onclick="decreaseCartQty(${index})">-</button>
                        <span class="qty-display">${item.quantity}</span>
                        <button class="qty-btn" onclick="increaseCartQty(${index})">+</button>
                    </div>
                </div>
                <div class="cart-item-actions">
                    <button class="buy-now-cart-btn" onclick="buyNowCartItem(${index})">Buy Now</button>
                    <button class="remove-cart-btn" onclick="removeFromCart(${index})">Remove</button>
                </div>
            </div>
        `;
        cartContainer.innerHTML += itemHTML;
    });
}

// ===== INCREASE CART ITEM QUANTITY =====
// Increases quantity of item directly from cart panel
function increaseCartQty(index){
    if(cartItems[index]){
        cartItems[index].quantity++;
        cartCount++;
        document.getElementById("cartCount").innerText = cartCount;
        saveCartState();
        updateCartDisplay();
    }
}

// ===== DECREASE CART ITEM QUANTITY =====
// Decreases quantity of item directly from cart panel
function decreaseCartQty(index){
    if(cartItems[index]){
        if(cartItems[index].quantity > 1){
            cartItems[index].quantity--;
            cartCount--;
        } else {
            // Remove item if quantity reaches 0
            cartCount -= cartItems[index].quantity;
            cartItems.splice(index, 1);
        }
        document.getElementById("cartCount").innerText = cartCount;
        saveCartState();
        updateCartDisplay();
    }
}

// ===== REMOVE FROM CART FUNCTION =====
// Removes item from cart panel
function removeFromCart(index){
    if(cartItems[index]){
        let itemName = cartItems[index].name;
        cartCount -= cartItems[index].quantity;
        cartItems.splice(index, 1);
        document.getElementById("cartCount").innerText = cartCount;
        saveCartState();
        updateCartDisplay();
        alert(itemName + " removed from Cart!");
    }
}

// ===== BUY NOW CART ITEM FUNCTION =====
function buyNowCartItem(index){
    if(cartItems[index]){
        let item = cartItems[index];
        let itemName = encodeURIComponent(item.name);
        let itemPrice = encodeURIComponent(item.price);
        window.location.href = `checkout.html?name=${itemName}&price=${itemPrice}`;
    }
}

// ===== TOGGLE CART FUNCTION =====
// Redirect cart button to cart checkout page
function toggleCart(){
    window.location.href = "cart_checkout.html";
}

// ===== CLOSE CART ON OUTSIDE CLICK =====
// Closes the cart panel when clicking anywhere outside of it
document.addEventListener("click", function(event){
    let cartPanel = document.getElementById("cartPanel");
    let cartBtn = document.querySelector(".cart-header-btn");
    
    // Check if click is outside the cart panel and cart button
    if(cartPanel && cartBtn){
        if(!cartPanel.contains(event.target) && !cartBtn.contains(event.target)){
            // Close the cart panel
            cartPanel.style.display = "none";
        }
    }
});



