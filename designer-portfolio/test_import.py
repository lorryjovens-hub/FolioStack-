from playwright.sync_api import sync_playwright

def test():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context()
        page = context.new_page()

        # Capture console messages
        console_logs = []
        page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))

        # Capture network requests
        failed_requests = []
        page.on("requestfailed", lambda req: failed_requests.append(f"{req.method} {req.url} - {req.failure}"))

        print("Opening import page...")
        page.goto('http://localhost:3001/import.html')
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(2000)

        # Check if logged in - if not, redirect to login
        if "login" in page.url or "landing" in page.url:
            print("Not logged in, attempting to login first...")

            # Go to landing/login page
            page.goto('http://localhost:3001/landing.html')
            page.wait_for_load_state('networkidle')

            # Try to login
            try:
                # Find email/username field
                email_input = page.locator('input[name="email"], input[name="username"]').first
                if email_input.is_visible():
                    email_input.fill("test@example.com")

                # Find password field
                password_input = page.locator('input[type="password"]').first
                if password_input.is_visible():
                    password_input.fill("password123")

                # Click login button
                login_btn = page.locator('button[type="submit"]').first
                if login_btn.is_visible():
                    login_btn.click()

                page.wait_for_timeout(2000)
            except Exception as e:
                print(f"Login attempt failed: {e}")

        # Now try to import links
        print("\n=== Testing Link Import ===")

        # Go to import page
        page.goto('http://localhost:3001/import.html')
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(2000)

        # Find the link textarea
        try:
            textarea = page.locator('#linkTextarea')
            if textarea.is_visible():
                print("Found link textarea, entering test URL...")
                textarea.fill("https://lorryjovens.netlify.app/")
                print("URL entered")

                # Click import button
                import_btn = page.locator('#importLinksBtn')
                if import_btn.is_visible():
                    print("Clicking import button...")
                    import_btn.click()
                    print("Import button clicked")

                    # Wait for response
                    page.wait_for_timeout(5000)
                    print("Waited 5 seconds for response")

                    # Check progress
                    progress = page.locator('#linkProgress')
                    if progress.is_visible():
                        detail = page.locator('#linkProgressDetail').text_content()
                        print(f"Progress detail: {detail}")
                else:
                    print("Import button not visible!")
            else:
                print("Link textarea not found!")
        except Exception as e:
            print(f"Error during import test: {e}")

        # Print console logs
        print("\n=== Console Logs ===")
        for log in console_logs:
            print(log)

        # Print failed requests
        print("\n=== Failed Requests ===")
        for req in failed_requests:
            print(req)

        # Take screenshot
        page.screenshot(path='D:/tmp/import_test.png', full_page=True)
        print("\nScreenshot saved to D:/tmp/import_test.png")

        browser.close()

if __name__ == "__main__":
    test()
