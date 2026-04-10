from playwright.sync_api import sync_playwright

def test_login_flow():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context()
        page = context.new_page()

        console_logs = []
        page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))

        network_logs = []
        page.on("response", lambda resp: network_logs.append(f"{resp.status} {resp.url}"))

        print("=== Step 1: Open Landing Page ===")
        page.goto('http://localhost:3001/landing.html')
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(1000)
        print(f"Current URL: {page.url}")

        print("\n=== Step 2: Open Login Modal ===")
        page.click('#loginNavBtn')
        page.wait_for_timeout(1000)

        # Check if modal is visible
        modal_visible = page.locator('#loginModal').is_visible()
        print(f"Login modal visible: {modal_visible}")

        # Check form fields
        username_input = page.locator('#loginForm input[name="username"]')
        password_input = page.locator('#loginForm input[name="password"]')
        submit_btn = page.locator('#loginForm button[type="submit"]')

        print(f"Username input visible: {username_input.is_visible()}")
        print(f"Password input visible: {password_input.is_visible()}")
        print(f"Submit button visible: {submit_btn.is_visible()}")

        print("\n=== Step 3: Fill Login Form ===")
        username_input.fill('testuser')
        password_input.fill('test123456')
        print("Form filled")

        print("\n=== Step 4: Submit Login ===")
        submit_btn.click()
        page.wait_for_timeout(3000)

        print(f"Current URL after login: {page.url}")

        # Check if token was stored
        token = page.evaluate("localStorage.getItem('token')")
        user = page.evaluate("localStorage.getItem('user')")
        print(f"Token stored: {'Yes' if token else 'No'}")
        print(f"User stored: {user[:50] + '...' if user and len(user) > 50 else user}")

        # Check console logs for errors
        print("\n=== Console Logs (errors only) ===")
        for log in console_logs:
            if 'error' in log.lower() or 'failed' in log.lower():
                print(log)

        # Check network logs
        print("\n=== Network Logs (last 15) ===")
        for log in network_logs[-15:]:
            print(log)

        # Take screenshot
        page.screenshot(path='D:/tmp/login_test.png', full_page=True)
        print("\nScreenshot saved to D:/tmp/login_test.png")

        browser.close()

if __name__ == "__main__":
    test_login_flow()