# Wordly

หน้าแอดมิน `/admin`: ดูสมาชิก กิจกรรมการเรียน และติดตามสถานะ feedback ดูวิธีสร้างตารางและให้สิทธิ์บัญชีใน [ADMIN.md](ADMIN.md)

เว็บฝึกภาษาอังกฤษสำหรับผู้ใช้ภาษาไทย: คำศัพท์ 400 คำใน 8 หมวด ตรวจคำแปลแบบเต็ม/ครึ่งคะแนน ฝึกแต่งประโยค คลังคำศัพท์ สถิติ และส่งความคิดเห็น

## Tech stack

Next.js 16 App Router, React 19, TypeScript (strict), Node.js และ Next.js Route Handlers สำหรับ API ใช้ PostgreSQL 16 ผ่าน Docker Compose เก็บสมาชิก, rate limits, sessions และ feedback โดยใช้ `pg` กับ parameterized SQL

## เริ่มใช้ในเครื่อง

ต้องมี Node.js 22.13+ (แนะนำ Node.js 24), Docker Desktop ที่เปิด Linux engine และ npm

```powershell
npm.cmd install
node scripts/setup-env.mjs
npm.cmd run db:up
npm.cmd run db:migrate
npm.cmd run dev
```

เปิด **http://localhost:4173** ให้ตรงกับ `APP_ORIGIN` ใน `.env` หากเปลี่ยน hostname/port ต้องเปลี่ยนค่านี้ด้วย

`setup-env.mjs` สร้าง `.env` พร้อมรหัสฐานข้อมูลและ `AUTH_SECRET` แบบสุ่ม และไม่เขียนทับไฟล์ที่มีอยู่แล้ว `.env` ถูก ignore จาก Git ดูค่าที่ต้องตั้งได้จาก `.env.example`

ฐานข้อมูลเปิดเฉพาะ `127.0.0.1:5433` ชื่อ database/user คือ `wordly` เก็บข้อมูลใน Docker volume `minieng_wordly_postgres` การหยุด container ไม่ลบข้อมูล หลีกเลี่ยง `docker compose down -v` หากต้องการเก็บข้อมูลไว้

## สมัครสมาชิกและเข้าสู่ระบบ

1. เลือกสมัครสมาชิก กรอกอีเมล รหัสผ่าน และยืนยันรหัสผ่าน
2. รหัสผ่านยาว 15–128 ตัวอักษร รองรับภาษาไทยและวลีหลายคำ
3. สมัครสำเร็จแล้วเข้าเรียนได้ทันที ครั้งต่อไปล็อกอินด้วยอีเมลและรหัสผ่านเดิม

อีเมลไม่แยกตัวพิมพ์เล็ก/ใหญ่ ระบบยังไม่มีการยืนยันอีเมลหรือกู้รหัสผ่าน

สำหรับฐานข้อมูลเดิม รัน `npm.cmd run db:migrate` เพื่อเพิ่มข้อมูลล็อกอินและลบตาราง OTP กับคอลัมน์เบอร์โทร บัญชีเดิมและ feedback ยังคงอยู่ แต่ session ของบัญชีที่ไม่มีอีเมล/รหัสผ่านจะถูกยกเลิก ผู้ใช้เบอร์โทรเดิมต้องสมัครบัญชีอีเมลใหม่ ความคืบหน้าของบัญชีเดิมไม่ได้ย้ายมาบัญชีใหม่อัตโนมัติ

## รหัสผ่านและ Session

- เก็บรหัสผ่านด้วย scrypt และ salt สุ่มเฉพาะบัญชี เก็บเฉพาะ SHA-256 ของ session token
- จำกัดล็อกอิน 10 ครั้ง/15 นาที/อีเมล และสมัคร 5 ครั้ง/15 นาที/อีเมล
- จำกัดรวม 60 ครั้ง/10 นาที/กลุ่ม client และ 300 ครั้ง/10 นาทีทั้งระบบ; สมัครได้ 10 ครั้ง/ชั่วโมง/กลุ่ม client
- ค่าเริ่มต้นไม่เชื่อถือ IP headers จึงใช้กลุ่ม client ร่วมกัน ถ้ามี reverse proxy ที่ **เขียนทับ header เสมอ** จึงตั้ง `TRUSTED_IP_HEADER` เช่น `x-real-ip` เพื่อแยก rate limit ตาม IP
- session อายุ 30 วัน คุกกี้ HttpOnly + SameSite=Lax และ Secure เมื่อใช้ HTTPS ออกจากระบบจะลบ session ฝั่งฐานข้อมูล
- API ที่แก้ไขข้อมูลตรวจ Origin ตรงกับ `APP_ORIGIN` และรับ JSON ไม่เกิน 16 KB
- หน้าเรียน, `/api/auth/me` และ feedback ตรวจ session ฝั่งเซิร์ฟเวอร์ ไม่มี API อ่าน feedback สาธารณะ

## ข้อมูลการเรียนเดิม

คำศัพท์ เกณฑ์ตรวจคำแปล ฟอนต์ และแบบฝึกประโยคเดิมย้ายเป็น TypeScript/React แล้ว ใช้ Web Speech API อ่านออกเสียง

ความคืบหน้ายังบันทึกใน `localStorage` **แยกตามบัญชีและเบราว์เซอร์ ยังไม่ซิงก์ข้ามเครื่อง** key ใหม่คือ `wordly.progress.v2.<user-id>` เมื่อพบ `wordly.progress.v1` จะมีปุ่มให้นำเข้าหลังเข้าสู่ระบบ โดยไม่ลบข้อมูลเดิมและไม่เขียนทับผลการเรียนล่าสุดของบัญชี หากเดิมเปิดด้วย `file://` ข้อมูลอยู่คนละ origin และไม่ปรากฏบน localhost อัตโนมัติ

feedback ใหม่เก็บใน PostgreSQL; ไฟล์เก่า `data/feedback.jsonl` (ถ้ามี) ยังคงเก็บไว้และไม่ได้ย้ายเข้าฐานข้อมูลอัตโนมัติ

## ตรวจสอบ

```powershell
npm.cmd run typecheck
npm.cmd test
npm.cmd run build
npm.cmd run test:browser
```

`test:browser` ต้องมี PostgreSQL ทำงานและ Chrome ติดตั้งไว้ สร้าง database ชื่อ `wordly_test_<random>` และเซิร์ฟเวอร์บนพอร์ตว่างอัตโนมัติ แล้วลบทิ้งเมื่อจบ ไม่เปลี่ยนสมาชิกใน `wordly` บัญชี DB ที่รันทดสอบต้องมีสิทธิ์สร้าง database เปลี่ยน browser ได้ด้วย `BROWSER_CHANNEL` ภาพทดสอบอยู่ใน `artifacts/`

เครื่อง Windows นี้บล็อก native SWC จึงใช้ Webpack และ `@next/swc-wasm-nodejs` เป็น compiler สำรอง `scripts/next.mjs` ระบุเส้นทาง WASM ให้ Next.js บน Windows เมื่ออัปเกรดให้ใช้เวอร์ชัน Next.js และ SWC ที่ตรงกัน แล้วทดสอบ wrapper ใหม่

## Production

ตั้ง `APP_ORIGIN=https://<โดเมนจริง>`, `AUTH_SECRET` สุ่มสำหรับ production และ PostgreSQL ถาวร แล้วรัน:

```powershell
npm.cmd run db:migrate
npm.cmd run build
npm.cmd start
```

วาง HTTPS reverse proxy หน้า Node server ที่ `127.0.0.1:4173` และสำรอง PostgreSQL volume ระบบกำหนดให้โดเมนสาธารณะใช้ HTTPS

## โครงสร้าง

```text
src/app/                 Next.js pages และ API routes
src/components/          React components (.tsx)
src/data/                คำศัพท์พร้อมเกณฑ์ตรวจ แยก 8 หมวด และประโยค (.ts)
src/lib/                 logic การเรียน, storage และ API client
src/server/              email/password auth, rate limits, PostgreSQL
src/styles/              CSS เดิมและหน้า login
public/assets/           favicon และฟอนต์พร้อมใบอนุญาต
db/                     database migrations
compose.yaml             PostgreSQL Docker service
tests/                   unit/security tests และ browser integration
```
