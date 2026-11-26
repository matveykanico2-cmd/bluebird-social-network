import {expect,test} from '@playwright/test';

test('auth screen is reachable and has accessible actions',async({page})=>{
  await page.goto('/');
  await expect(page.getByRole('heading',{name:'bluebird'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Создать аккаунт'})).toBeVisible();
  await expect(page.getByRole('button',{name:'Забыли пароль?'})).toBeVisible();
});
