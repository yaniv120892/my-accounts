import { admitSignInCodeMail, sendSignInCodeMail } from '@/services/signInCodeMail';

import { createAuth } from './createAuth';

export const auth = createAuth({
  admitSignInCode: admitSignInCodeMail,
  sendSignInCode: sendSignInCodeMail,
});
