from playwright.sync_api import sync_playwright

def test():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context()
        page = context.new_page()

        console_logs = []
        page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))

        network_logs = []
        page.on("response", lambda resp: network_logs.append(f"{resp.status} {resp.url}"))

        print("1. Opening landing page...")
        page.goto('http://localhost:3001/landing.html')
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(1000)

        print("2. Clicking login button to open modal...")
        page.click('#loginNavBtn')
        page.wait_for_timeout(1000)

        print("3. Checking if login modal is visible...")
        modal = page.locator('#loginModal')
        is_visible = modal.is_visible()
        print(f"Login modal visible: {is_visible}")

        if is_visible:
            print("4. Filling login form...")
            page.fill('input[name="username"]', 'testuser')
            page.fill('input[name="password"]', 'test123456')
            page.wait_for_timeout(500)

            print("5. Submitting login form...")
            page.click('button[type="submit"]')
            page.wait_for_timeout(3000)

        # Check localStorage for token
        token = page.evaluate("localStorage.getItem('token')")
        if token:
            print(f"Token obtained: {token[:50]}...")
        else:
            print("No token found!")

        print("6. Navigating to import page...")
        page.goto('http://localhost:3001/import.html')
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(2000)

        print("7. Checking import page state...")
        textarea = page.locator('#linkTextarea')
        print(f"Textarea visible: {textarea.is_visible()}")

        import_btn = page.locator('#importLinksBtn')
        print(f"Import button visible: {import_btn.is_visible()}")

        print("8. Entering test URL...")
        textarea.fill("https://lorryjovens.netlify.app/")
        page.wait_for_timeout(500)

        print("9. Clicking import button...")
        import_btn.click()

        print("10. Waiting for response...")
        page.wait_for_timeout(8000)

        # Check console logs
        print("\n=== Console Logs (last 15) ===")
        for log in console_logs[-15:]:
            print(log)

        # Check network logs
        print("\n=== Network Logs - import requests ===")
        for log in network_logs:
            if 'import' in log.lower() or 'works' in log.lower():
                print(log)

        # Check progress
        try:
            progress = page.locator('#linkProgressDetail')
            if progress.is_visible(timeout=2000):
                print(f"\nProgress: {progress.text_content()}")
        except:
            print("\nProgress not visible")

        # Check toast
        try:
            toast = page.locator('.toast')
            if toast.is_visible(timeout=2000):
                print(f"Toast: {toast.text_content()}")
        except:
            print("Toast not visible")

        page.screenshot(path='D:/tmp/import_test3.png', full_page=True)
        print("\nScreenshot saved to D:/tmp/import_test3.png")

        browser.close()

if __name__ == "__main__":
    test()
