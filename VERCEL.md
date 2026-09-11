# สมัครสมาชิกบน Vercel ไม่ได้

ข้อความ “ระบบยังไม่พร้อมใช้งาน กรุณาลองใหม่ภายหลัง” คือ API ตอบ 503 เมื่อเกิดข้อผิดพลาดฝั่งเซิร์ฟเวอร์ ไม่ได้หมายความว่าอีเมลหรือรหัสผ่านผิด

ฐานข้อมูล Docker บนเครื่องและไฟล์ `.env` ไม่ได้ถูกนำขึ้น Vercel พร้อม Git ต้องตั้งค่าฐานข้อมูลที่เซิร์ฟเวอร์ Vercel เข้าถึงได้แยกต่างหาก

## ตั้งค่าให้ใช้งานได้

1. เตรียม PostgreSQL ที่เข้าถึงได้จาก Vercel และใช้ connection string พร้อมการตั้งค่า TLS ตามผู้ให้บริการ ห้ามใช้ `localhost`, `127.0.0.1` หรือ `db` ของ Docker ในเครื่อง
2. ใน Vercel Project → Settings → Environment Variables ตั้ง `DATABASE_URL` เป็น connection string นั้น และ `AUTH_SECRET` เป็นค่าสุ่มอย่างน้อย 32 ตัวอักษร สร้างได้ด้วย `node -e "console.log(require('crypto').randomBytes(32).toString('hex'))"` อย่าใส่ prefix `NEXT_PUBLIC_` ให้สองค่านี้
3. ตั้ง `APP_ORIGIN` เป็น URL ที่ผู้ใช้เปิดจริง เช่น `https://ชื่อเว็บ.vercel.app` ไม่มี path หากไม่ตั้ง โค้ดใช้ `VERCEL_PROJECT_PRODUCTION_URL` สำหรับ Production และ `VERCEL_URL` สำหรับ Preview อย่าคัดลอกค่า localhost จาก `.env` ขึ้นไป
4. เลือก environment ให้ตรงกับ deployment ที่จะใช้ หากใช้ Preview ให้แยกฐานข้อมูลและตั้ง origin ของ Preview ให้ถูกต้อง
5. สร้างไฟล์ `.env.production.local` ในเครื่อง (ถูก Git ignore) ใส่ `DATABASE_URL` ของฐานข้อมูล Production แล้วรัน `node --env-file=.env.production.local scripts/migrate.mjs` เพื่อสร้าง/ปรับ schema ตรวจให้แน่ใจว่าเลือกฐานข้อมูลถูกต้องและสำรองฐานข้อมูลเดิมก่อน เพราะ migrations ปรับ schema และข้อมูลเก่าบางส่วน ดู SQL ใน `db/` ก่อนรัน
6. Redeploy แล้วลองสมัครและออกจากระบบ/เข้าสู่ระบบอีกครั้ง บัญชีในฐานข้อมูลเครื่องจะไม่ปรากฏในฐานข้อมูลออนไลน์โดยอัตโนมัติ

## อ่านสาเหตุใน Runtime Logs

ดู request `/api/auth/register` และข้อความ `Wordly API request failed:`

| รหัส | วิธีแก้ |
| --- | --- |
| `AUTH_SECRET_INVALID` | ตั้ง AUTH_SECRET แบบสุ่มอย่างน้อย 32 ตัวอักษร |
| `APP_ORIGIN_MISSING` / `APP_ORIGIN_INVALID` / `APP_ORIGIN_HTTPS_REQUIRED` / `APP_ORIGIN_LOCAL_ON_VERCEL` | ตั้ง APP_ORIGIN เป็น HTTPS ของเว็บจริง |
| `DATABASE_URL_MISSING` / `DATABASE_URL_INVALID` / `DATABASE_URL_LOCAL_ON_VERCEL` | ตั้ง DATABASE_URL ของ PostgreSQL ออนไลน์ |
| `ECONNREFUSED` / `ENOTFOUND` / `ETIMEDOUT` / `ECONNRESET` | ตรวจ host, port และการเข้าถึงฐานข้อมูล |
| `28P01` / `3D000` | ตรวจข้อมูลล็อกอินหรือชื่อฐานข้อมูล |
| `42P01` / `42703` | รัน migrations ให้ครบในฐานข้อมูลที่ deployment ใช้ |
| `53300` | ตรวจจำนวนการเชื่อมต่อและ connection pool ของฐานข้อมูล |
| `DEPTH_ZERO_SELF_SIGNED_CERT` / `UNABLE_TO_VERIFY_LEAF_SIGNATURE` | ตรวจ certificate และ TLS ตามผู้ให้บริการ |

Log ไม่แสดง connection string, รหัสผ่าน หรือ request body ข้อความทั่วไปบนหน้าเว็บยังคงป้องกันการเปิดเผยรายละเอียดเซิร์ฟเวอร์

อ้างอิง: [Vercel system environment variables](https://vercel.com/docs/environment-variables/system-environment-variables), [การตั้งค่า environment variables](https://vercel.com/docs/environment-variables)
