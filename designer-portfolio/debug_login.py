from playwright.sync_api import sync_playwright

def debug_login_issue():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context()
        page = context.new_page()

        # Capture all console messages
        page.on("console", lambda msg: print(f"[CONSOLE {msg.type}] {msg.text}"))

        print("=== Opening Landing Page ===")
        page.goto('http://localhost:3001/landing.html')
        page.wait_for_load_state('domcontentloaded')
        page.wait_for_timeout(2000)

        print("\n=== Page Title ===")
        print(page.title())

        print("\n=== Clicking Login Button ===")
        try:
            page.click('#loginNavBtn')
            print("Login button clicked")
        except Exception as e:
            print(f"Error clicking login button: {e}")

        page.wait_for_timeout(1500)

        print("\n=== Checking Modal ===")
        modal = page.locator('#loginModal')
        print(f"Modal display: {modal.evaluate('el => window.getComputedStyle(el).display')}")
        print(f"Modal visibility: {modal.is_visible()}")

        print("\n=== Filling Form ===")
        try:
            page.fill('#loginForm input[name="username"]', 'testuser')
            page.fill('#loginForm input[name="password"]', 'test123456')
            print("Form filled")
        except Exception as e:
            print(f"Error filling form: {e}")

        print("\n=== Submitting Form ===")
        try:
            page.click('#loginForm button[type="submit"]')
            print("Submit clicked")
        except Exception as e:
            print(f"Error clicking submit: {e}")

        page.wait_for_timeout(3000)

        print("\n=== Final URL ===")
        print(page.url)

        print("\n=== Checking for Error Messages ===")
        try:
            error_el = page.locator('#loginError')
            if error_el.is_visible():
                print(f"Login Error: {error_el.text_content()}")
        except:
            pass

        try:
            success_el = page.locator('#loginSuccess')
            if success_el.is_visible():
                print(f"Login Success: {success_el.text_content()}")
        except:
            pass

        # Take screenshot
        page.screenshot(path='D:/tmp/debug_login.png', full_page=False)
        print("\nScreenshot saved to D:/tmp/debug_login.png")

        browser.close()

if __name__ == "__main__":
    debug_login_issue()