import route from '@/helpers/route';
import { FleschKincaidReadability } from '@/types/types';
import axios from 'axios';

export async function getReadability(content: string) {
    return await axios
        .post<FleschKincaidReadability>(route('readability'), {
            content,
        })
        .then(resp => resp.data);
}
