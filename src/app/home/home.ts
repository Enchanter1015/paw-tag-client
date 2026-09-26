import { Component } from '@angular/core';
import { RouterLink } from '@angular/router';
import { PtButton } from '../shared/pt-button/pt-button';

@Component({
  selector: 'app-home',
  standalone: true,
  imports: [RouterLink, PtButton],
  templateUrl: './home.html',
  styleUrl: './home.scss',
})
export class Home {}
