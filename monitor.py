# import psutil
# import requests
# import time
# import socket
# import joblib
# import pandas as pd
# import asyncio
# import os
# from dotenv import load_dotenv

# # =========================
# # === НАСТРОЙКИ AGENT ===
# # =========================
# load_dotenv(".env.agent")

# SERVER_URL = os.getenv("SERVER_URL", "http://localhost:8000")
# ACCESS_TOKEN = os.getenv("ACCESS_TOKEN")
# CHECK_INTERVAL = int(os.getenv("CHECK_INTERVAL", "600"))

# if not ACCESS_TOKEN:
#     print("[ERROR] ACCESS_TOKEN не задан в .env!")
#     print("[ERROR] Зарегистрируй ПК на сервере и получи токен.")
#     exit(1)

# HEADERS = {
#     "X-Access-Token": ACCESS_TOKEN,
#     "Content-Type": "application/json"
# }

# # =========================
# # === НАСТРОЙКИ LHM ===
# # =========================
# LHM_URL = "http://localhost:8085/data.json"
# session = requests.Session()

# # Кэш для тяжелых операций
# _cache = {"last_smart": 0, "smart_status": 0}

# # Загружаем модель вентиляторов
# try:
#     # fan_model = joblib.load("fan_speed_model.pkl")
#     fan_model = joblib.load('main_models/fan_speed_model.pkl')
# except:
#     fan_model = None


# # =========================
# # === SMART STATUS ===
# # =========================
# def get_smart_status():
#     now = time.time()
#     if now - _cache["last_smart"] < 1800:
#         return _cache["smart_status"]
#     try:
#         import subprocess
#         out = subprocess.check_output("wmic diskdrive get status", shell=True).decode()
#         status = 1 if "Pred Fail" in out else 0
#         _cache.update({"smart_status": status, "last_smart": now})
#         return status
#     except:
#         return 0


# # =========================
# # === LHM PARSER ===
# # =========================
# def parse_lhm(node, res):
#     """Парсинг Libre Hardware Monitor с фильтрацией по типу."""
#     text = node.get("Text", "")
#     stype = node.get("Type", "")
#     val_raw = node.get("Value", "")

#     if val_raw and val_raw != "-":
#         try:
#             val = float(val_raw.split()[0].replace(",", "."))
#             if stype == "Temperature" and text == "CPU Package":
#                 res["temp"] = val
#             elif stype == "Voltage" and text == "CPU Core":
#                 res["volt"] = val
#         except:
#             pass

#     for child in node.get("Children", []):
#         parse_lhm(child, res)


# # =========================
# # === COLLECT METRICS ===
# # =========================
# def collect_metrics():
#     # 1. Системные метрики
#     cpu = psutil.cpu_percent(interval=1)
#     ram = psutil.virtual_memory().percent
#     disk = psutil.disk_usage("/").percent
#     uptime = (time.time() - psutil.boot_time()) / 86400
#     smart = get_smart_status()

#     # 2. Libre Hardware Monitor
#     lhm_res = {"temp": None, "volt": None}
#     try:
#         data = session.get(LHM_URL, timeout=1).json()
#         parse_lhm(data, lhm_res)
#     except:
#         pass

#     temp = lhm_res["temp"] or 45.0
#     volt = lhm_res["volt"] or 0.8

#     # 3. Сеть
#     try:
#         start = time.time()
#         socket.create_connection(("8.8.8.8", 53), timeout=1).close()
#         latency = (time.time() - start) * 1000
#     except:
#         latency = 30.0

#     # 4. Предсказание вентиляторов
#     fan_speed = 2500.0
#     if fan_model:
#         try:
#             input_df = pd.DataFrame(
#                 [[cpu, ram, disk, temp, latency, volt, smart, uptime]],
#                 columns=[
#                     "cpu_usage",
#                     "ram_usage",
#                     "disk_usage",
#                     "temperature",
#                     "network_latency",
#                     "power_voltage",
#                     "errors_count",
#                     "uptime_days"
#                 ]
#             )
#             fan_speed = float(fan_model.predict(input_df)[0])
#         except:
#             pass

#     return {
#         "cpu_usage": cpu,
#         "ram_usage": ram,
#         "disk_usage": disk,
#         "temperature": temp,
#         "fan_speed": fan_speed,
#         "network_latency": latency,
#         "power_voltage": volt,
#         "errors_count": smart,
#         "uptime_days": uptime
#     }


# # =========================
# # === MONITOR LOOP ===
# # =========================
# async def monitor_loop():
#     print(f"[AGENT] Агент запущен. Сервер: {SERVER_URL}")
#     print(f"[AGENT] Интервал проверки: {CHECK_INTERVAL} сек.")

#     while True:
#         try:
#             # 1. Собрать метрики
#             metrics = await asyncio.to_thread(collect_metrics)

#             # 2. Отправить на сервер
#             response = await asyncio.to_thread(
#                 lambda: requests.post(
#                     f"{SERVER_URL}/metrics/",
#                     json=metrics,
#                     headers=HEADERS,
#                     timeout=30
#                 )
#             )

#             if response.status_code == 200:
#                 data = response.json()
#                 prob = data.get("probability", 0)
#                 pred = data.get("prediction", 0)
#                 alert_status = data.get("alert_status", "unknown")
#                 print(f"[OK] pred={pred} prob={prob:.2%} status={alert_status}")

#             elif response.status_code == 401:
#                 print("[ERROR] Неверный ACCESS_TOKEN! Проверь .env файл.")

#             else:
#                 print(f"[ERROR] Сервер вернул {response.status_code}: {response.text}")

#         except requests.exceptions.ConnectionError:
#             print(f"[ERROR] Не удалось подключиться к серверу {SERVER_URL}")

#         except Exception as e:
#             print(f"[ERROR] {e}")

#         await asyncio.sleep(CHECK_INTERVAL)


# # =========================
# # === ENTRY POINT ===
# # =========================
# if __name__ == "__main__":
#     asyncio.run(monitor_loop())