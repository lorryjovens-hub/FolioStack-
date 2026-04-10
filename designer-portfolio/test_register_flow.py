from playwright.sync_api import sync_playwright

def check_404_resources():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context()
        page = context.new_page()

        failed_requests = []
        page.on("requestfailed", lambda req: failed_requests.append(f"{req.method} {req.url} - {req.failure}"))

        not_found = []
        page.on("response", lambda resp: not_found.append(f"{resp.status} {resp.url}") if resp.status == 404 else None)

        print("Opening landing page...")
        page.goto('http://localhost:3001/landing.html')
        page.wait_for_load_state('networkidle')
        page.wait_for_timeout(3000)

        print("\n=== 404 Resources ===")
        for r in not_found:
            print(r)

        print("\n=== Failed Requests ===")
        for r in failed_requests:
            print(r)

        browser.close()

def test_register_flow():
    with sync_playwright() as p:
        browser = p.chromium.launch(headless=False)
        context = browser.new_context()
        page = context.new_page()

        console_logs = []
        page.on("console", lambda msg: console_logs.append(f"[{msg.type}] {msg.text}"))

        print("\n=== Testing Register Flow ===")
        page.goto('http://localhost:3001/landing.html')
        page.wait_for_load_state('networkidle')

        # Click register button in nav
        page.click('#registerNavBtn')
        page.wait_for_timeout(1000)

        # Fill register form
        page.fill('#registerForm input[name="username"]', 'playwrightuser')
        page.fill('#registerForm input[name="email"]', 'playwright@test.com')
        page.fill('#registerForm input[name="password"]', 'test123456')
        page.wait_for_timeout(500)

        # Submit
        page.click('#registerForm button[type="submit"]')
        page.wait_for_timeout(3000)

        print(f"URL after register: {page.url}")

        token = page.evaluate("localStorage.getItem('token')")
        print(f"Token stored: {'Yes' if token else 'No'}")

        # Check for errors
        print("\n=== Console Logs (errors) ===")
        for log in console_logs:
            if 'error' in log.lower():
                print(log)

        browser.close()

if __name__ == "__main__":
    check_404_resources()
    test_register_flow()