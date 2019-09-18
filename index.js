const express = require("express");
const app = express();
const cookieSession = require("cookie-session");
const csurf = require("csurf");
const hb = require("express-handlebars");
const ca = require("chalk-animation");
const db = require("./utils/db");
// const bc = require("./utils/bc");
const { hash, compare } = require("./utils/bc");

// cookie session setup
app.use(
    cookieSession({
        secret: `I'm always angry.`,
        maxAge: 1000 * 60 * 60 * 24 * 14
    })
);

// express handlebars setup
app.engine("handlebars", hb());
app.set("view engine", "handlebars");

// setup to see user submitted get request
app.use(
    express.urlencoded({
        extended: false
    })
);

// CSRF protection middleware
app.use(csurf());

// handle vunerabilities
app.use(function(req, res, next) {
    res.setHeader("x-frame-options", "deny");
    res.locals.csrfToken = req.csrfToken();
    next();
});

// css connect
app.use(express.static("./public"));
app.use(express.static("./img"));

// middleware redirects logic
app.use(function(req, res, next) {
    if (
        !req.session.userId &&
        req.url != "/register" &&
        req.url != "/login" &&
        req.url != "/about"
    ) {
        res.redirect("/register");
    } else {
        next();
    }
});

// R O U T E S

app.get("/register", (req, res) => {
    res.render("register", {
        layout: "main"
    });
});

app.post("/register", (req, res) => {
    let first = req.body.first;
    let last = req.body.last;
    let email = req.body.email;
    let password = req.body.password;
    first = first.toLowerCase();
    first = first.charAt(0).toUpperCase() + first.substring(1);
    last = last.toLowerCase();
    last = last.charAt(0).toUpperCase() + last.substring(1);

    hash(password).then(hash => {
        // console.log("hash: ", hash);
        db.addAccounts(first, last, email, hash)
            .then(id => {
                req.session.userId = id.rows[0].id;
                res.redirect("/profile");
            })
            .catch(error => {
                console.log("error: ", error);
                res.render("register", {
                    error: "error"
                });
            });
    });
});

app.get("/profile", (req, res) => {
    // console.log(req.session.user_id);
    res.render("profile");
});

app.post("/profile", (req, res) => {
    let age = req.body.age;
    let city = req.body.city;
    let url = req.body.url;
    let userId = req.session.userId;
    city = city.toLowerCase();
    city = city.charAt(0).toUpperCase() + city.substring(1);

    db.addUserProfiles(age, city, url, userId)
        .then(() => {
            if (!url.startsWith("http" && !req.body.url === null)) {
                let http = "http://";
                url = http.concat(url);
            }
            res.redirect("/signature");
        })
        .catch(error => {
            console.log("error: ", error);
            res.render("profile", {
                error: "error"
            });
        });
});

app.get("/login", (req, res) => {
    res.render("login", {
        layout: "main"
    });
});

app.post("/login", (req, res) => {
    let email = req.body.email;
    let password = req.body.password;
    db.getLogin(email)
        .then(results => {
            // console.log(results);
            compare(password, results.rows[0].password)
                .then(compResult => {
                    if (compResult) {
                        req.session.userId = results.rows[0].id;
                        // res.redirect("/signature");
                        db.getSignature(results.rows[0].id)
                            .then(sig => {
                                console.log("signature is: ", sig);
                                req.session.signatureId = sig.rows[0].id;
                                res.redirect("/signers");
                            })
                            .catch(error => {
                                console.log("getSignature error:", error);
                                res.redirect("/signature");
                            });
                    } else {
                        res.render("login", {
                            error: Error
                        });
                    }
                    // console.log(compResult);
                })
                .catch(error => {
                    console.log("compare error: ", error);
                    res.render("login", {
                        error: "error"
                    });
                });
        })
        .catch(error => {
            console.log("error: ", error);
            res.render("login", {
                error: "error"
            });
        });
});

app.get("/signature", (req, res) => {
    console.log(req.session);
    if (!req.session.signatureId) {
        if (req.session.userId) {
            res.render("signature", {
                layout: "main"
            });
        } else {
            res.redirect("/register");
            console.log("redirected from signature");
        }
    } else if (req.session.signatureId) {
        res.redirect("/thanks");
        console.log("redirected from signature");
    }
});

app.post("/signature", (req, res) => {
    let signature = req.body.signature;
    if (signature == "") {
        res.render("signature", {
            error: "error"
        });
    } else {
        let userId = req.session.userId;
        db.addSignature(signature, userId)
            .then(id => {
                req.session.signatureId = id.rows[0].id;
                res.redirect("/thanks");
                console.log("redirected from signature postreq");
            })
            .catch(error => {
                console.log("error: ", error);
                res.render("signature", {
                    error: "error"
                });
            });
    }
});

app.get("/thanks", (req, res) => {
    // console.log("thanks req.session: ", req.session);
    if (req.session.signatureId) {
        console.log("Thanks route");
        db.getSignature(req.session.userId)
            .then(sig => {
                db.countSigners()
                    .then(count => {
                        let countTable = count.rows[0].count;
                        console.log(sig);
                        res.render("thanks", {
                            sig: sig.rows[0],
                            count: countTable
                        });
                    })
                    .catch(error => {
                        console.log("error thanks route: ", error);
                    });
            })
            .catch(error => {
                console.log("error thanks route: ", error);
            });
    } else {
        res.redirect("/register");
        console.log("redirected from thanks");
    }
});

app.post("/thanks", (req, res) => {
    db.deleteSignature(req.session.userId)
        .then(() => {
            req.session.signatureId = null;
            res.redirect("/signature");
        })
        .catch(error => {
            console.log("error post thank: ", error);
        });
});

app.get("/signers", (req, res) => {
    if (req.session.signatureId) {
        console.log("Signers route");
        db.getSigners(req.session.signatureId)
            .then(signers => {
                res.render("signers", {
                    signers: signers.rows
                });
            })
            .catch(error => {
                console.log("error: ", error);
            });
    } else {
        res.redirect("/signature");
        console.log("redirected from signers");
    }
});

app.get("/profile/edit", (req, res) => {
    if (req.session.userId) {
        db.getUserInfo(req.session.userId)
            .then(signers => {
                res.render("edit", {
                    signers: signers.rows,
                    layout: "main"
                });
            })
            .catch(error => {
                console.log("error: ", error);
            });
    } else {
        res.redirect("/register");
        console.log("redirected from profile edit");
    }
});

app.post("/profile/edit", (req, res) => {
    let first = req.body.first;
    let last = req.body.last;
    let age = req.body.age;
    let city = req.body.city;
    let url = req.body.url;
    let email = req.body.email;
    let password = req.body.password;
    let userId = req.session.userId;

    first = first.toLowerCase();
    first = first.charAt(0).toUpperCase() + first.substring(1);
    last = last.toLowerCase();
    last = last.charAt(0).toUpperCase() + last.substring(1);
    city = city.toLowerCase();
    city = city.charAt(0).toUpperCase() + city.substring(1);

    if (!url.startsWith("http")) {
        url = "http://" + url;
    } else if (url === null) {
        url = null;
    } else if (url == "https://" || url == "http://") {
        url = null;
    }

    // console.log("password", password);
    if (password == "") {
        db.updateProfile(first, last, email, userId)
            .then(() => {
                db.updateProfileOpt(userId, age, city, url)
                    .then(() => {
                        res.redirect("/signature");
                    })
                    .catch(error => {
                        console.log("updateProfileOpt error: ", error);
                        res.render("edit", {
                            error: "error"
                        });
                    });
            })
            .catch(error => {
                console.log("updateProfile error: ", error);
                res.render("edit", {
                    error: "error"
                });
            });
    } else {
        console.log("made it to the else block");
        hash(password).then(hash => {
            db.updateProfilePw(first, last, email, hash, userId)
                .then(() => {
                    db.updateProfileOpt(userId, age, city, url)
                        .then(() => {
                            res.redirect("/signature");
                        })
                        .catch(error => {
                            console.log("updateProfileOpt PW error: ", error);
                            res.render("edit", {
                                error: "error"
                            });
                        });
                })
                .catch(error => {
                    console.log("updateProfilePW error: ", error);
                    res.render("edit", {
                        error: "error"
                    });
                });
        });
    }
});

app.get("/signers/:city", (req, res) => {
    if (req.session.signatureId) {
        db.filterByCities(req.params.city)
            .then(cities => {
                res.render("city", {
                    signers: cities,
                    city: req.params.city,
                    layout: "main"
                });
            })
            .catch(error => {
                console.log("error: ", error);
            });
    } else {
        res.redirect("/signature");
        console.log("redirected from signers/city");
    }
});

app.get("/about", (req, res) => {
    res.render("about", {
        layout: "main"
    });
});

// O T H E R
app.get("/", (req, res) => {
    res.redirect("/register");
});

app.get("/logout", (req, res) => {
    req.session = null;
    res.redirect("/login");
});

app.listen(process.env.PORT || 8080, () => {
    ca.rainbow("ʕ•ᴥ•ʔ The Petition Express is running...");
});
