import assert from 'node:assert/strict'
import { chromium } from 'playwright-core'

const baseUrl = process.env.SMOKE_BASE_URL ?? 'http://127.0.0.1:5173'
const chromePath = process.env.SMOKE_CHROME_PATH ??
  'C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe'
const password = process.env.SMOKE_PASSWORD
const buyerEmail = process.env.SMOKE_BUYER_EMAIL
const sellerEmail = process.env.SMOKE_SELLER_EMAIL
const adminEmail = process.env.SMOKE_ADMIN_EMAIL

if (!password || !buyerEmail || !sellerEmail || !adminEmail) {
  throw new Error('Set SMOKE_PASSWORD, SMOKE_BUYER_EMAIL, SMOKE_SELLER_EMAIL, and SMOKE_ADMIN_EMAIL for seeded local accounts.')
}

const browser = await chromium.launch({ executablePath: chromePath, headless: true })
const browserErrors = []

async function pageFor(email, expectedPath = '/') {
  const context = await browser.newContext()
  const page = await context.newPage()
  page.on('pageerror', (error) => browserErrors.push(`${email}: ${error.message}`))
  await page.goto(`${baseUrl}/login/email`)
  await page.getByLabel('이메일').fill(email)
  await page.getByLabel('비밀번호', { exact: true }).fill(password)
  await page.getByRole('button', { name: '로그인', exact: true }).click()
  await page.waitForURL(`${baseUrl}${expectedPath}`, { timeout: 15_000 })
  return { context, page }
}

async function check(name, action) {
  await action()
  process.stdout.write(`PASS ${name}\n`)
}

try {
  const publicPage = await browser.newPage()
  publicPage.on('pageerror', (error) => browserErrors.push(`public: ${error.message}`))
  await check('public listing and categories', async () => {
    await publicPage.goto(baseUrl)
    await publicPage.locator('.listing-card').first().waitFor()
    assert.ok(await publicPage.getByRole('navigation', { name: '상품 카테고리' }).getByRole('button').count() > 1)
  })
  await check('community', async () => {
    await publicPage.goto(`${baseUrl}/community`)
    await publicPage.locator('.community-post-card').first().waitFor()
  })
  await check('notices', async () => {
    await publicPage.goto(`${baseUrl}/notices`)
    await publicPage.locator('.notice-card').first().waitFor()
  })

  const buyer = await pageFor(buyerEmail)
  const seller = await pageFor(sellerEmail)
  await check('buyer chat rooms', async () => {
    await buyer.page.goto(`${baseUrl}/chat`)
    await buyer.page.locator('.chat-room-card').first().waitFor()
  })
  await check('realtime buyer and seller chat', async () => {
    const buyerRoom = await buyer.page.locator('.chat-room-card').first().getAttribute('href')
    assert.ok(buyerRoom)
    await buyer.page.goto(`${baseUrl}${buyerRoom}`)
    await seller.page.goto(`${baseUrl}${buyerRoom}`)
    await buyer.page.locator('.message-composer textarea').waitFor()
    await seller.page.locator('.message-composer textarea').waitFor()
    const message = `local-smoke-${Date.now()}`
    await seller.page.getByPlaceholder('메시지를 입력하세요').fill(message)
    await seller.page.getByRole('button', { name: '메시지 보내기' }).click()
    await buyer.page.getByText(message, { exact: true }).waitFor({ timeout: 10_000 })
  })
  await check('buyer notifications and settings', async () => {
    await buyer.page.goto(`${baseUrl}/notifications`)
    await buyer.page.getByRole('heading', { name: '내 알림' }).waitFor()
    await buyer.page.getByText('거래', { exact: true }).first().waitFor()
  })
  await check('buyer suggested chatbot', async () => {
    await buyer.page.goto(`${baseUrl}/chatbot`)
    await buyer.page.getByRole('heading', { name: '추천 질문' }).waitFor()
    assert.ok(await buyer.page.locator('.chatbot-suggestions button').count() > 0)
  })
  await check('buyer account settings', async () => {
    await buyer.page.goto(`${baseUrl}/me/settings`)
    await buyer.page.getByText('프로필', { exact: true }).first().waitFor()
  })
  await check('concurrent 401 recovery', async () => {
    const result = await buyer.page.evaluate(async () => {
      const loaded = (path) => {
        const urls = performance.getEntriesByType('resource').map((entry) => entry.name)
          .filter((url) => new URL(url).pathname === path)
        if (!urls.length) throw new Error(`Browser module not loaded: ${path}`)
        return import(urls.at(-1))
      }
      const { useAuthStore } = await loaded('/src/features/auth/model/authStore.ts')
      const { apiRequest } = await loaded('/src/shared/api/http.ts')
      useAuthStore.getState().setAccessToken('expired-access-token')
      const paths = ['/users/me', '/notifications/unread-count', '/blocks']
      const results = await Promise.allSettled(paths.map((path) => apiRequest(path)))
      return {
        results: results.map((entry) => entry.status === 'fulfilled'
          ? { status: 'fulfilled' }
          : { status: 'rejected', code: entry.reason?.code, httpStatus: entry.reason?.status }),
        tokenChanged: useAuthStore.getState().accessToken !== 'expired-access-token',
      }
    })
    assert.deepEqual(result.results, [{ status: 'fulfilled' }, { status: 'fulfilled' }, { status: 'fulfilled' }],
      JSON.stringify(result))
    assert.equal(result.tokenChanged, true)
  })
  await check('cross-tab refresh rotation', async () => {
    const secondTab = await buyer.context.newPage()
    await secondTab.goto(`${baseUrl}/notices`)
    const refreshTab = (page) => page.evaluate(async () => {
      if (!navigator.locks?.request) throw new Error('Web Locks unavailable')
      const loaded = (path) => {
        const urls = performance.getEntriesByType('resource').map((entry) => entry.name)
          .filter((url) => new URL(url).pathname === path)
        if (!urls.length) throw new Error(`Browser module not loaded: ${path}`)
        return import(urls.at(-1))
      }
      const [{ authApi }, { useAuthStore }, { apiRequest }] = await Promise.all([
        loaded('/src/features/auth/api/authApi.ts'),
        loaded('/src/features/auth/model/authStore.ts'),
        loaded('/src/shared/api/http.ts'),
      ])
      const refreshed = await authApi.refresh()
      useAuthStore.getState().setAccessToken(refreshed.accessToken)
      return apiRequest('/users/me')
    })
    const [first, second] = await Promise.all([refreshTab(buyer.page), refreshTab(secondTab)])
    assert.equal(first.userId, second.userId)
    await secondTab.close()
  })
  await check('buyer profile image upload', async () => {
    const encodedPng = await buyer.page.evaluate(() => {
      const canvas = document.createElement('canvas')
      canvas.width = 2
      canvas.height = 2
      canvas.getContext('2d').fillRect(0, 0, 2, 2)
      return canvas.toDataURL('image/png').split(',')[1]
    })
    const png = Buffer.from(encodedPng, 'base64')
    await buyer.page.getByLabel('프로필 사진 변경').last().setInputFiles({ name: 'smoke.png', mimeType: 'image/png', buffer: png })
    await buyer.page.getByRole('button', { name: '프로필 저장' }).click()
    await buyer.page.getByText('프로필을 저장했습니다.').waitFor({ timeout: 12_000 }).catch(async (error) => {
      process.stderr.write(`${await buyer.page.locator('main').innerText()}\n`)
      throw error
    })
    await buyer.page.locator('.profile-picker img').waitFor()
  })
  await check('buyer logout', async () => {
    await buyer.page.getByRole('button', { name: '로그아웃' }).click()
    await buyer.page.getByRole('dialog', { name: '로그아웃할까요?' }).getByRole('button', { name: '로그아웃' }).click()
    await buyer.page.waitForURL(`${baseUrl}/login`)
    await buyer.page.getByText('로그아웃되었습니다.').waitFor()
  })

  await check('seller listing categories', async () => {
    await seller.page.goto(`${baseUrl}/listings/new`)
    const category = seller.page.getByLabel('카테고리')
    await category.waitFor()
    await category.locator('option').nth(1).waitFor({ state: 'attached' })
    assert.ok(await category.locator('option').count() > 1)
  })

  const admin = await pageFor(adminEmail, '/admin')
  for (const [path, heading] of [
    ['/admin', '대시보드'],
    ['/admin/users', '회원 관리'],
    ['/admin/reports', '신고 관리'],
    ['/admin/notices', '공지사항 관리'],
    ['/admin/audit-logs', '감사 로그'],
    ...(process.env.SMOKE_SKIP_CREDENTIALS === 'true' ? [] : [['/admin/credentials', '인증정보 상태']]),
  ]) {
    await check(`admin ${path}`, async () => {
      await admin.page.goto(`${baseUrl}${path}`)
      await admin.page.getByRole('heading', { name: heading, exact: true }).waitFor()
    })
  }
  assert.deepEqual(browserErrors, [], 'Browser runtime errors')
  process.stdout.write('Local browser smoke passed.\n')
} finally {
  await browser.close()
}
