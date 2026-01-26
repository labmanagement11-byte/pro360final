-- Tabla para progreso de subtareas por asignación, usuario y casa
create table if not exists subtask_progress (
    id bigserial primary key,
    assignment_id bigint references calendar_assignments(id) on delete cascade,
    user_id bigint references app_users(id) on delete cascade,
    house_id bigint references houses(id) on delete set null,
    subtasks_progress jsonb not null,
    updated_at timestamptz default now(),
    unique (assignment_id, user_id)
);

-- Index para consultas rápidas por asignación y usuario
create index if not exists idx_subtask_progress_assignment_user on subtask_progress(assignment_id, user_id);
