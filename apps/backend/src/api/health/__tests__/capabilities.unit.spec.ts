import { GET } from "../capabilities/route"

describe("Capabilities Health Endpoint (ADR-0109, ADR-0111)", () => {
  const originalEnv = process.env

  beforeEach(() => {
    process.env = { ...originalEnv }
  })

  afterAll(() => {
    process.env = originalEnv
  })

  function makeReq(shouldDatabaseSucceed = true) {
    const rawMock = shouldDatabaseSucceed
      ? jest.fn().mockResolvedValue([{ "?column?": 1 }])
      : jest.fn().mockRejectedValue(new Error("DB Connection Refused"))

    return {
      scope: {
        resolve: jest.fn().mockReturnValue({ raw: rawMock }),
      },
    } as any
  }

  function makeRes() {
    const jsonMock = jest.fn()
    const statusMock = jest.fn().mockReturnValue({ json: jsonMock })
    return {
      res: { status: statusMock } as any,
      statusMock,
      jsonMock,
    }
  }

  it("returns 200 available when mandatory database and all capabilities are healthy", async () => {
    process.env.STRIPE_API_KEY = "sk_test_123"
    const req = makeReq(true)
    const { res, statusMock, jsonMock } = makeRes()

    await GET(req, res)

    expect(statusMock).toHaveBeenCalledWith(200)
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "available",
        capabilities: expect.objectContaining({
          database: { status: "available", required: true },
          payment_gateway: { status: "available", required: false },
          media: { status: "available", required: false },
          notifications: { status: "available", required: false },
        }),
      })
    )
  })

  it("returns 200 degraded when an optional capability (e.g. Stripe) is unavailable", async () => {
    delete process.env.STRIPE_API_KEY
    const req = makeReq(true)
    const { res, statusMock, jsonMock } = makeRes()

    await GET(req, res)

    expect(statusMock).toHaveBeenCalledWith(200)
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "degraded",
        capabilities: expect.objectContaining({
          database: { status: "available", required: true },
          payment_gateway: { status: "unavailable", required: false },
        }),
      })
    )
  })

  it("returns 503 unavailable when mandatory database dependency fails", async () => {
    const req = makeReq(false)
    const { res, statusMock, jsonMock } = makeRes()

    await GET(req, res)

    expect(statusMock).toHaveBeenCalledWith(503)
    expect(jsonMock).toHaveBeenCalledWith(
      expect.objectContaining({
        status: "unavailable",
        capabilities: expect.objectContaining({
          database: { status: "unavailable", required: true },
        }),
      })
    )
  })
})
