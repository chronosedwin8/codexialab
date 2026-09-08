-- Migración 003: plan de Prueba (10.000 COP / 24 horas)
ALTER TYPE tipo_licencia ADD VALUE IF NOT EXISTS 'prueba';
