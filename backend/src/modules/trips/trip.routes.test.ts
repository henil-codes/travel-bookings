import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import { FastifyInstance } from 'fastify'
import { buildApp } from '@/app'
import { db } from '@/db'
import { trips } from '@/db/schema/trips'
import { vehicles } from '@/db/schema/vehicles'
import { seats } from '@/db/schema/seats'
import { users } from '@/db/schema/users'
import { eq } from 'drizzle-orm'

describe('Trip Routes Integration', () => {
    let app: FastifyInstance;
    let serverUrl: string;
    let testVehicleId: string;
    let testTripId: string;
    let testUserId: string;
    let adminToken: string;
    let operatorToken: string;
    let customerToken: string;

    beforeAll(async () => {
        
    })
})