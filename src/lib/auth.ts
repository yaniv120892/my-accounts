import { sendSignInCodeMail } from '@/services/signInCodeMail';

import { createAuth } from './createAuth';

export const auth = createAuth({ sendSignInCode: sendSignInCodeMail });
