import { createSlice, PayloadAction } from '@reduxjs/toolkit';

const user = {
  authState: false,
  userDetails: {
    name: '',
    phone: '',
    email: '',
    location: { latitude: 0, longitude: 0, accuracy: 0 },
    profession: '',
    language: '',
  },
};
