# SPDX-FileCopyrightText: 2026 Marcus Baw and Baw Medical Ltd
# SPDX-License-Identifier: AGPL-3.0-or-later

"""Targeted synthetic cases for a local WASM playground build.

Run with Python Playwright and Chromium installed:
    python3 gui/tests/engine-form-regressions.py gui/dist-web
"""
from functools import partial
import json
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
import sys
import threading

from playwright.sync_api import expect, sync_playwright


class QuietHandler(SimpleHTTPRequestHandler):
    def log_message(self, *_args):
        pass


def run(page, base):
    errors = []
    page.on("pageerror", lambda error: errors.append(str(error)))
    form = page.locator(".calc-layout-form")
    state = form.locator("[data-result-state]")
    request = page.get_by_label("Request JSON")

    def goto(name):
        page.goto(f"{base}/#{name}")
        form.wait_for()

    def fill(values):
        for label, value in values.items():
            form.get_by_role("textbox", name=label, exact=True).fill(value)

    def choose(group, label):
        form.get_by_role("radiogroup", name=group, exact=True).get_by_text(label, exact=True).click()

    goto("fena")
    fill({"Urine sodium": "40", "Plasma sodium": "135", "Urine creatinine": "5", "Plasma creatinine": "300"})
    choose("Urine creatinine unit", "mmol/L")
    expect(state).to_have_attribute("data-result-state", "incomplete")
    choose("Plasma creatinine unit", "µmol/L")
    expect(state).to_have_attribute("data-result-state", "ready")
    expect(state.locator("h1")).to_have_text("1.78")
    data = json.loads(request.input_value())
    assert data["urine_creatinine_unit"] == "mmol_l"
    assert data["plasma_creatinine_unit"] == "umol_l"

    goto("feurea")
    fill({"Urine urea": "100", "Plasma urea": "28", "Urine creatinine": "10", "Plasma creatinine": "250"})
    choose("Urine urea unit", "Urea mmol/L")
    choose("Plasma urea unit", "Urea nitrogen mg/dL")
    choose("Urine creatinine unit", "mmol/L")
    choose("Plasma creatinine unit", "µmol/L")
    expect(state.locator("h1")).to_have_text("25.0")

    goto("map")
    fill({"Systolic BP": "90", "Diastolic BP": "52.485"})
    expect(state.locator("h1")).to_have_text("64.99")
    expect(state.get_by_text("Below 65 mmHg", exact=True)).to_be_visible()
    fill({"Diastolic BP": "52.5"})
    expect(state.locator("h1")).to_have_text("65.0")

    goto("winters_formula")
    fill({"Bicarbonate": "20", "Measured PaCO2": "5.1"})
    expect(state).to_have_attribute("data-result-state", "incomplete")
    choose("PaCO2 unit", "kPa")
    expect(state).to_have_attribute("data-result-state", "ready")
    expect(state.get_by_text("Appropriate compensation", exact=True)).to_be_visible()
    assert json.loads(request.input_value())["measured_paco2_kpa"] == 5.1
    choose("PaCO2 unit", "mmHg")
    expect(state).to_have_attribute("data-result-state", "incomplete")

    goto("gestational_age")
    months = form.get_by_role("radiogroup", name="Month", exact=True)
    months.nth(0).get_by_text("Jan", exact=True).click()
    months.nth(1).get_by_text("Jan", exact=True).click()
    for year in form.get_by_role("textbox", name="Year", exact=True).all():
        year.fill("2026")
    days = form.get_by_role("textbox", name="Day", exact=True)
    days.nth(0).fill("1")
    days.nth(1).fill("5")
    fill({"Usual cycle length": "35"})
    expect(state).to_have_attribute("data-result-state", "incomplete")
    expect(state.get_by_text("precedes the cycle-adjusted start", exact=False)).to_be_visible()
    months.nth(1).get_by_text("Oct", exact=True).click()
    days.nth(1).fill("15")
    expect(state).to_have_attribute("data-result-state", "ready")
    expect(state.get_by_text("Gestational age 40 weeks 0 days", exact=False)).to_be_visible()

    goto("epds")
    expect(form.get_by_text("Use an authorised copy", exact=False)).to_be_visible()
    for i in range(1, 11):
        group = f"Item {i}" if i < 10 else "Item 10 (self-harm)"
        if i == 10:
            answer = "1st answer (scores 3)"
        elif i in (1, 2, 4):
            answer = "1st answer (scores 0)"
        else:
            answer = "4th answer (scores 0)"
        choose(group, answer)
    expect(state.locator("h1")).to_have_text("3")
    assert json.loads(request.input_value())["responses"] == [0] * 9 + [3]
    expect(state.get_by_text("Item 10", exact=False).first).to_be_visible()
    assert not errors, errors


with ThreadingHTTPServer(("127.0.0.1", 0), partial(QuietHandler, directory=sys.argv[1])) as server:
    threading.Thread(target=server.serve_forever, daemon=True).start()
    with sync_playwright() as playwright:
        browser = playwright.chromium.launch(executable_path="/usr/bin/chromium")
        run(browser.new_page(viewport={"width": 1600, "height": 1000}), f"http://127.0.0.1:{server.server_port}")
        print("PASS: mixed-unit FENa and FEUrea, MAP at the threshold, kPa conversion, gestational dating, and EPDS scoring-only form")
    server.shutdown()
