# CVEditor accounts (Sign in with Google)

`roeetal.com/CVEditor` lets anyone build a résumé. Signed-in users keep their résumés in a **private cloud vault**.

| Who | Sees | Saved where |
|---|---|---|
| Not signed in | the example résumé (John Doe, IT, University of Haifa). Never the owner's data. | nowhere (it's a demo); the edits are kept if they sign in right after |
| Signed in with Google | only their own résumés | Cloud Firestore `vaults/<uid>`, readable and writable **only** by that user (`firestore.rules`) |
| The owner (his verified Google accounts; `OWNER_EMAIL_HASHES` in cveditor.js holds only their SHA-256 hashes) | his own résumés. On first sign-in they are copied from `content/cv.json`. He also gets "Publish to main website CV". | same, his own vault |

Nobody can open anyone else's vault, the owner included. The Firestore rules enforce this on Google's servers, not the page's code.

## Files
* `assets/cveditor-cloud.js` (`window.RTCloud`): loads Firebase (Auth + Firestore, compat SDK 10.12.2 from gstatic), and handles sign-in/out and loading/saving the vault (debounced writes, 1 MB document limit).
* `assets/cveditor-firebase.json`: the Firebase web config. **Empty (`{}`) = Google sign-in is off.** The page says "isn't switched on yet" instead of faking a login. The config is public by design, because it only names the project.
* `firestore.rules`: the security rules. Paste them into the Firebase console.
* In `assets/cveditor.js`:
  * `onCloudUser()`: what happens on sign-in/out.
  * `Storage.saveVault()`: Google users' résumés are never written to the device's localStorage.
  * `renderTopbarAuth()`: the account box at the top of the side menu.
  * `isRoeeUser()`: the owner check.

## Setup status
Done on 2026-11-06. Project `roeetal-cv`, Google provider on, authorized domains `roeetal.com` + `www.roeetal.com`, Firestore `(default)` in `eur3` (Standard edition, production mode), `firestore.rules` published, web app "CVEditor" registered, config in `assets/cveditor-firebase.json`.

## One-time setup (for a new project)
1. **Create the project:** open https://console.firebase.google.com and click **Add project**. Name it `roeetal-cv` (Google Analytics can be off).
2. **Turn on Google sign-in:**
   1. Build › **Authentication** › Get started.
   2. Sign-in method › **Google** › Enable. Pick a support email and save.
3. **Allow the site's domains:** Authentication › Settings › **Authorized domains** › add `roeetal.com` and `www.roeetal.com`.
4. **Create the database:** Build › **Firestore Database** › Create database. Choose production mode and a location in Europe (e.g. `eur3`).
5. **Lock it down:** Firestore › **Rules**. Replace everything with the contents of `firestore.rules`, then click **Publish**.
6. **Get the web config:**
   1. Project settings (⚙) › General › Your apps › **Web `</>`**. Register the app as "CVEditor" (no hosting).
   2. Copy the `firebaseConfig` values (`apiKey`, `authDomain`, `projectId`, `appId`, …) into `assets/cveditor-firebase.json` as JSON.
   3. Commit. After the Action rebuilds the site, the Google button works.

The free (Spark) plan is enough: 50k reads and 20k writes per day.
