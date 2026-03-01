import { APIGatewayProxyEventV2, APIGatewayProxyResultV2 } from 'aws-lambda';
import { DynamoDBClient } from '@aws-sdk/client-dynamodb';
import {
  DynamoDBDocumentClient,
  PutCommand,
  GetCommand,
  QueryCommand,
  DeleteCommand,
  BatchWriteCommand,
} from '@aws-sdk/lib-dynamodb';

// Initialize DynamoDB client
const client = new DynamoDBClient({});
const docClient = DynamoDBDocumentClient.from(client);

const TABLE_NAME = process.env.DYNAMODB_TABLE || 'DebtSettler-prod';

// Types
interface Participant {
  id: string;
  name: string;
  amount: number;
}

interface Transfer {
  id: string;
  from: string;
  to: string;
  amount: number;
}

// CORS headers
const corsHeaders = {
  'Content-Type': 'application/json',
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type,Authorization',
  'Access-Control-Allow-Methods': 'GET,POST,PUT,DELETE,OPTIONS',
};

// Helper to create response
function response(statusCode: number, body: unknown): APIGatewayProxyResultV2 {
  return {
    statusCode,
    headers: corsHeaders,
    body: JSON.stringify(body),
  };
}

// Get user ID from JWT claims
function getUserId(event: APIGatewayProxyEventV2): string | null {
  const claims = event.requestContext?.authorizer?.jwt?.claims;
  return (claims?.sub as string) || null;
}

// Generate unique ID
function generateId(): string {
  return `${Date.now()}-${Math.random().toString(36).substring(2, 9)}`;
}

function shuffle<T>(arr: T[]): void {
  for (let i = arr.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [arr[i], arr[j]] = [arr[j], arr[i]];
  }
}

// Settlement algorithm
function computeSettlement(participants: Participant[]): Transfer[] {
  const creditors: { name: string; amount: number }[] = [];
  const debtors: { name: string; amount: number }[] = [];

  for (const p of participants) {
    if (p.amount > 0.01) {
      creditors.push({ name: p.name, amount: p.amount });
    } else if (p.amount < -0.01) {
      debtors.push({ name: p.name, amount: Math.abs(p.amount) });
    }
  }

  shuffle(creditors);
  shuffle(debtors);

  const transfers: Transfer[] = [];
  let transferId = 1;
  let i = 0;
  let j = 0;

  while (i < creditors.length && j < debtors.length) {
    const creditor = creditors[i];
    const debtor = debtors[j];
    const transferAmount = Math.min(creditor.amount, debtor.amount);

    if (transferAmount > 0.01) {
      transfers.push({
        id: `transfer-${transferId++}`,
        from: debtor.name,
        to: creditor.name,
        amount: Math.round(transferAmount * 100) / 100,
      });
    }

    creditor.amount -= transferAmount;
    debtor.amount -= transferAmount;

    if (creditor.amount < 0.01) i++;
    if (debtor.amount < 0.01) j++;
  }

  return transfers;
}

// Route handlers
async function handleHealth(): Promise<APIGatewayProxyResultV2> {
  return response(200, { message: 'DebtSettler API is healthy', timestamp: new Date().toISOString() });
}

async function handleListSessions(userId: string): Promise<APIGatewayProxyResultV2> {
  const result = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': 'SESSION#',
      },
    })
  );

  const sessions = (result.Items || []).map((item) => ({
    sessionId: item.sessionId,
    title: item.title,
    currency: item.currency,
    createdAt: item.createdAt,
    status: item.status,
  }));

  return response(200, sessions);
}

async function handleGetSession(userId: string, sessionId: string): Promise<APIGatewayProxyResultV2> {
  // Get session metadata
  const sessionResult = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${userId}`,
        SK: `SESSION#${sessionId}`,
      },
    })
  );

  if (!sessionResult.Item) {
    return response(404, { message: 'Session not found' });
  }

  // Get participants
  const participantsResult = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': `ITEM#${sessionId}#`,
      },
    })
  );

  // Get results/transfers
  const resultsResult = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': `RESULT#${sessionId}#`,
      },
    })
  );

  const session = {
    sessionId: sessionResult.Item.sessionId,
    title: sessionResult.Item.title,
    currency: sessionResult.Item.currency,
    createdAt: sessionResult.Item.createdAt,
    updatedAt: sessionResult.Item.updatedAt,
    status: sessionResult.Item.status,
    participants: (participantsResult.Items || []).map((item) => ({
      id: item.itemId,
      name: item.name,
      amount: item.amount,
    })),
    transfers: (resultsResult.Items || []).map((item) => ({
      id: item.resultId,
      from: item.from,
      to: item.to,
      amount: item.amount,
    })),
  };

  return response(200, session);
}

async function handleCreateSession(userId: string, body: string | undefined): Promise<APIGatewayProxyResultV2> {
  if (!body) {
    return response(400, { message: 'Request body is required' });
  }

  const data = JSON.parse(body);
  const { title, currency, participants } = data;

  if (!title || !currency || !participants || !Array.isArray(participants)) {
    return response(400, { message: 'title, currency, and participants are required' });
  }

  const sessionId = generateId();
  const now = new Date().toISOString();

  // Create session metadata
  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        PK: `USER#${userId}`,
        SK: `SESSION#${sessionId}`,
        sessionId,
        title,
        currency,
        createdAt: now,
        updatedAt: now,
        status: 'draft',
      },
    })
  );

  // Create participant items
  for (const participant of participants) {
    const itemId = generateId();
    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          PK: `USER#${userId}`,
          SK: `ITEM#${sessionId}#${itemId}`,
          sessionId,
          itemId,
          name: participant.name,
          amount: participant.amount,
        },
      })
    );
  }

  return response(201, { sessionId });
}

async function handleUpdateSession(
  userId: string,
  sessionId: string,
  body: string | undefined
): Promise<APIGatewayProxyResultV2> {
  if (!body) {
    return response(400, { message: 'Request body is required' });
  }

  // Check session exists
  const existingSession = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${userId}`,
        SK: `SESSION#${sessionId}`,
      },
    })
  );

  if (!existingSession.Item) {
    return response(404, { message: 'Session not found' });
  }

  const data = JSON.parse(body);
  const now = new Date().toISOString();

  // Update session metadata
  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        ...existingSession.Item,
        title: data.title || existingSession.Item.title,
        updatedAt: now,
      },
    })
  );

  // If participants provided, delete old and create new
  if (data.participants && Array.isArray(data.participants)) {
    // Delete existing participants
    const existingParticipants = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `USER#${userId}`,
          ':sk': `ITEM#${sessionId}#`,
        },
      })
    );

    if (existingParticipants.Items && existingParticipants.Items.length > 0) {
      const deleteRequests = existingParticipants.Items.map((item) => ({
        DeleteRequest: {
          Key: { PK: item.PK, SK: item.SK },
        },
      }));

      // BatchWrite in chunks of 25
      for (let i = 0; i < deleteRequests.length; i += 25) {
        await docClient.send(
          new BatchWriteCommand({
            RequestItems: {
              [TABLE_NAME]: deleteRequests.slice(i, i + 25),
            },
          })
        );
      }
    }

    // Create new participants
    for (const participant of data.participants) {
      const itemId = generateId();
      await docClient.send(
        new PutCommand({
          TableName: TABLE_NAME,
          Item: {
            PK: `USER#${userId}`,
            SK: `ITEM#${sessionId}#${itemId}`,
            sessionId,
            itemId,
            name: participant.name,
            amount: participant.amount,
          },
        })
      );
    }
  }

  return response(200, { message: 'Session updated' });
}

async function handleDeleteSession(userId: string, sessionId: string): Promise<APIGatewayProxyResultV2> {
  const pk = `USER#${userId}`;

  // Fetch session metadata, participant items, and result items separately
  const [sessionItems, participantItems, resultItems] = await Promise.all([
    docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND SK = :sk',
      ExpressionAttributeValues: { ':pk': pk, ':sk': `SESSION#${sessionId}` },
    })),
    docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: { ':pk': pk, ':sk': `ITEM#${sessionId}#` },
    })),
    docClient.send(new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: { ':pk': pk, ':sk': `RESULT#${sessionId}#` },
    })),
  ]);

  if (!sessionItems.Items || sessionItems.Items.length === 0) {
    return response(404, { message: 'Session not found' });
  }

  const allItems = [
    ...(sessionItems.Items || []),
    ...(participantItems.Items || []),
    ...(resultItems.Items || []),
  ];

  const deleteRequests = allItems.map((item) => ({
    DeleteRequest: { Key: { PK: item.PK, SK: item.SK } },
  }));

  for (let i = 0; i < deleteRequests.length; i += 25) {
    await docClient.send(
      new BatchWriteCommand({
        RequestItems: { [TABLE_NAME]: deleteRequests.slice(i, i + 25) },
      })
    );
  }

  return response(200, { message: 'Session deleted' });
}

async function handleSettle(userId: string, sessionId: string, body: string | undefined): Promise<APIGatewayProxyResultV2> {
  // Get session
  const sessionResult = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${userId}`,
        SK: `SESSION#${sessionId}`,
      },
    })
  );

  if (!sessionResult.Item) {
    return response(404, { message: 'Session not found' });
  }

  // Use frontend-provided transfers if supplied, otherwise compute from participants
  const parsed = body ? JSON.parse(body) : {};
  let transfers: Transfer[];

  if (parsed.transfers && Array.isArray(parsed.transfers) && parsed.transfers.length > 0) {
    transfers = parsed.transfers;
  } else {
    const participantsResult = await docClient.send(
      new QueryCommand({
        TableName: TABLE_NAME,
        KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
        ExpressionAttributeValues: {
          ':pk': `USER#${userId}`,
          ':sk': `ITEM#${sessionId}#`,
        },
      })
    );

    const participants: Participant[] = (participantsResult.Items || []).map((item) => ({
      id: item.itemId,
      name: item.name,
      amount: item.amount,
    }));

    transfers = computeSettlement(participants);
  }

  // Delete existing results
  const existingResults = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': `RESULT#${sessionId}#`,
      },
    })
  );

  if (existingResults.Items && existingResults.Items.length > 0) {
    const deleteRequests = existingResults.Items.map((item) => ({
      DeleteRequest: {
        Key: { PK: item.PK, SK: item.SK },
      },
    }));

    for (let i = 0; i < deleteRequests.length; i += 25) {
      await docClient.send(
        new BatchWriteCommand({
          RequestItems: {
            [TABLE_NAME]: deleteRequests.slice(i, i + 25),
          },
        })
      );
    }
  }

  // Save new results
  for (const transfer of transfers) {
    const resultId = generateId();
    await docClient.send(
      new PutCommand({
        TableName: TABLE_NAME,
        Item: {
          PK: `USER#${userId}`,
          SK: `RESULT#${sessionId}#${resultId}`,
          sessionId,
          resultId,
          from: transfer.from,
          to: transfer.to,
          amount: transfer.amount,
        },
      })
    );
  }

  // Update session status
  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        ...sessionResult.Item,
        status: 'settled',
        updatedAt: new Date().toISOString(),
      },
    })
  );

  return response(200, { transfers });
}

async function handleReopenSession(userId: string, sessionId: string): Promise<APIGatewayProxyResultV2> {
  // Get session
  const sessionResult = await docClient.send(
    new GetCommand({
      TableName: TABLE_NAME,
      Key: {
        PK: `USER#${userId}`,
        SK: `SESSION#${sessionId}`,
      },
    })
  );

  if (!sessionResult.Item) {
    return response(404, { message: 'Session not found' });
  }

  // Delete all stored result items
  const existingResults = await docClient.send(
    new QueryCommand({
      TableName: TABLE_NAME,
      KeyConditionExpression: 'PK = :pk AND begins_with(SK, :sk)',
      ExpressionAttributeValues: {
        ':pk': `USER#${userId}`,
        ':sk': `RESULT#${sessionId}#`,
      },
    })
  );

  if (existingResults.Items && existingResults.Items.length > 0) {
    const deleteRequests = existingResults.Items.map((item) => ({
      DeleteRequest: { Key: { PK: item.PK, SK: item.SK } },
    }));

    for (let i = 0; i < deleteRequests.length; i += 25) {
      await docClient.send(
        new BatchWriteCommand({
          RequestItems: { [TABLE_NAME]: deleteRequests.slice(i, i + 25) },
        })
      );
    }
  }

  // Reset session status to draft
  await docClient.send(
    new PutCommand({
      TableName: TABLE_NAME,
      Item: {
        ...sessionResult.Item,
        status: 'draft',
        updatedAt: new Date().toISOString(),
      },
    })
  );

  return response(200, { message: 'Session reopened' });
}

// Main handler
export const handler = async (event: APIGatewayProxyEventV2): Promise<APIGatewayProxyResultV2> => {
  console.log('Event:', JSON.stringify(event, null, 2));

  const { routeKey, pathParameters, body } = event;

  try {
    // Health check (no auth required)
    if (routeKey === 'GET /api/health') {
      return handleHealth();
    }

    // All other routes require authentication
    const userId = getUserId(event);
    if (!userId) {
      return response(401, { message: 'Unauthorized' });
    }

    const sessionId = pathParameters?.sessionId;

    switch (routeKey) {
      case 'GET /api/sessions':
        return handleListSessions(userId);

      case 'POST /api/sessions':
        return handleCreateSession(userId, body);

      case 'GET /api/sessions/{sessionId}':
        if (!sessionId) return response(400, { message: 'Session ID required' });
        return handleGetSession(userId, sessionId);

      case 'PUT /api/sessions/{sessionId}':
        if (!sessionId) return response(400, { message: 'Session ID required' });
        return handleUpdateSession(userId, sessionId, body);

      case 'DELETE /api/sessions/{sessionId}':
        if (!sessionId) return response(400, { message: 'Session ID required' });
        return handleDeleteSession(userId, sessionId);

      case 'POST /api/sessions/{sessionId}/settle':
        if (!sessionId) return response(400, { message: 'Session ID required' });
        return handleSettle(userId, sessionId, body);

      case 'POST /api/sessions/{sessionId}/reopen':
        if (!sessionId) return response(400, { message: 'Session ID required' });
        return handleReopenSession(userId, sessionId);

      default:
        return response(404, { message: 'Not found' });
    }
  } catch (error) {
    console.error('Error:', error);
    return response(500, {
      message: 'Internal server error',
      error: error instanceof Error ? error.message : 'Unknown error',
    });
  }
};
