import { createLdsTestWireAdapter } from '@salesforce/wire-service-jest-util';

export const getObjectInfo = createLdsTestWireAdapter(jest.fn());
export const getObjectInfos = createLdsTestWireAdapter(jest.fn());
export const getPicklistValues = createLdsTestWireAdapter(jest.fn());
export const getPicklistValuesByRecordType = createLdsTestWireAdapter(jest.fn());
