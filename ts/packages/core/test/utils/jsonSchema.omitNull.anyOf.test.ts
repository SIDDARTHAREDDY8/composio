import { describe, it, expect } from 'vitest';
import { omitNullToolArguments } from '../../src/utils/jsonSchema';

/**
 * Regression tests for https://github.com/ComposioHQ/composio/issues/5399:
 * `omitNullToolArguments` only consulted the first `anyOf`/`oneOf` object
 * branch, so a `null` for an optional parameter declared only by a later
 * branch was forwarded to the tool instead of being dropped as "omitted".
 */
describe('omitNullToolArguments with anyOf/oneOf object branches', () => {
  const schema = {
    type: 'object',
    properties: {
      target: {
        anyOf: [
          { type: 'object', properties: { channel: { type: 'string' } }, required: ['channel'] },
          {
            type: 'object',
            properties: { email: { type: 'string' }, note: { type: 'string' } },
            required: ['email'],
          },
        ],
      },
    },
    required: ['target'],
  };

  it('drops a null for an optional parameter declared only by a later branch', () => {
    expect(omitNullToolArguments({ target: { email: 'a@b.com', note: null } }, schema)).toEqual({
      target: { email: 'a@b.com' },
    });
  });

  it('behaves the same for oneOf', () => {
    const oneOfSchema = {
      type: 'object',
      properties: { target: { oneOf: schema.properties.target.anyOf } },
      required: ['target'],
    };
    expect(
      omitNullToolArguments({ target: { email: 'a@b.com', note: null } }, oneOfSchema)
    ).toEqual({ target: { email: 'a@b.com' } });
  });

  it('keeps a null for a key no branch declares', () => {
    expect(
      omitNullToolArguments({ target: { email: 'a@b.com', unknown: null } }, schema)
    ).toEqual({ target: { email: 'a@b.com', unknown: null } });
  });

  it('keeps a null when a declaring branch accepts null', () => {
    const nullableNote = {
      type: 'object',
      properties: {
        target: {
          anyOf: [
            { type: 'object', properties: { channel: { type: 'string' } }, required: ['channel'] },
            {
              type: 'object',
              properties: { email: { type: 'string' }, note: { type: ['string', 'null'] } },
              required: ['email'],
            },
          ],
        },
      },
      required: ['target'],
    };
    expect(
      omitNullToolArguments({ target: { email: 'a@b.com', note: null } }, nullableNote)
    ).toEqual({ target: { email: 'a@b.com', note: null } });
  });

  it('drops nested nulls below a property declared only by a later branch', () => {
    const nested = {
      type: 'object',
      properties: {
        target: {
          anyOf: [
            { type: 'object', properties: { channel: { type: 'string' } }, required: ['channel'] },
            {
              type: 'object',
              properties: {
                email: { type: 'string' },
                address: {
                  type: 'object',
                  properties: { line1: { type: 'string' }, line2: { type: 'string' } },
                  required: ['line1'],
                },
              },
              required: ['email'],
            },
          ],
        },
      },
      required: ['target'],
    };
    expect(
      omitNullToolArguments(
        { target: { email: 'a@b.com', address: { line1: '1 Main St', line2: null } } },
        nested
      )
    ).toEqual({ target: { email: 'a@b.com', address: { line1: '1 Main St' } } });
  });

  it('stays bounded when a branch references itself', () => {
    const cyclic = {
      type: 'object',
      properties: {
        node: {
          anyOf: [
            { $ref: '#/$defs/Node' },
            { type: 'object', properties: { note: { type: 'string' } }, required: [] },
          ],
        },
      },
      $defs: {
        Node: {
          type: 'object',
          properties: { child: { $ref: '#/$defs/Node' }, label: { type: 'string' } },
          required: ['label'],
        },
      },
    };
    expect(omitNullToolArguments({ node: { note: null } }, cyclic)).toEqual({ node: {} });
  });
});
