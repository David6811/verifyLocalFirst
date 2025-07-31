import { createClient } from '@supabase/supabase-js'

const supabaseUrl = 'https://ojmhumklnwgqimwpfmjd.supabase.co'
const supabaseKey = 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6Im9qbWh1bWtsbndncWltd3BmbWpkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NDM4MTk4MTgsImV4cCI6MjA1OTM5NTgxOH0.ybyKq-9aEZucOG6FqPbpqAov6c3TasVjMJE69V7s-4k'

export const supabase = createClient(supabaseUrl, supabaseKey, {
  realtime: {
    params: {
      eventsPerSecond: 10,
    },
  },
})